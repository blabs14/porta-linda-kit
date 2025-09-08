'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function DebugHolidaysPage() {
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // 1. Verificar autenticação
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        console.log('DEBUG: Auth user:', user);
        console.log('DEBUG: Auth error:', authError);
        setAuthUser(user);

        // 2. Testar consulta direta de feriados com contratos
        console.log('DEBUG: Testing direct holiday query with contracts...');
        const { data: allHolidays, error: holidaysError } = await supabase
          .from('payroll_holidays')
          .select(`
            *,
            payroll_contracts(
              id,
              name,
              is_active
            )
          `)
          .gte('date', '2025-01-01')
          .lte('date', '2025-12-31')
          .order('date');
        
        console.log('DEBUG: All holidays count:', allHolidays?.length || 0);
        console.log('DEBUG: Holidays error:', holidaysError);
        if (allHolidays && allHolidays.length > 0) {
          console.log('DEBUG: First few holidays with contracts:', allHolidays.slice(0, 3));
        }

        if (holidaysError) {
          throw holidaysError;
        }

        setHolidays(allHolidays || []);
        
        // 3. Verificar especificamente 15 de agosto
        const august15 = allHolidays?.find(h => h.date === '2025-08-15');
        console.log('DEBUG: August 15 holiday found:', august15);
        
        // 4. Se temos user, testar com filtro de user e contratos ativos
        if (user) {
          console.log('DEBUG: Testing with user filter for user:', user.id);
          const { data: userHolidays, error: userError } = await supabase
            .from('payroll_holidays')
            .select(`
              *,
              payroll_contracts!inner(
                id,
                name,
                is_active
              )
            `)
            .eq('user_id', user.id)
            .eq('payroll_contracts.is_active', true)
            .gte('date', '2025-01-01')
            .lte('date', '2025-12-31')
            .order('date');
          
          console.log('DEBUG: User holidays count:', userHolidays?.length || 0);
          console.log('DEBUG: User holidays error:', userError);
        }

      } catch (err) {
        console.error('DEBUG: Error loading data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return <div className="p-4">Loading debug data...</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Debug Holidays</h1>
      
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="font-bold">Auth Status:</h2>
        <p>User: {authUser ? authUser.id : 'Not authenticated'}</p>
        <p>Email: {authUser?.email || 'N/A'}</p>
        <p className="text-sm text-gray-600 mt-2">
          DB User ID: 017a5ae9-3ac6-4866-b9e6-e364c9c4ecf6
        </p>
        {authUser && (
          <p className={`text-sm mt-1 ${
            authUser.id === '017a5ae9-3ac6-4866-b9e6-e364c9c4ecf6' 
              ? 'text-green-600' 
              : 'text-red-600'
          }`}>
            {authUser.id === '017a5ae9-3ac6-4866-b9e6-e364c9c4ecf6' 
              ? '✅ User ID matches DB' 
              : '❌ User ID does NOT match DB'
            }
          </p>
        )}
      </div>

      <div className="bg-gray-100 p-4 rounded">
        <h2 className="font-bold">Holidays Found: {holidays.length}</h2>
        {error && <p className="text-red-500">Error: {error}</p>}
        
        <div className="mt-2">
          <h3 className="font-semibold">August 15, 2025 Check:</h3>
          {holidays.find(h => h.date === '2025-08-15') ? (
            <p className="text-green-600">✅ Found August 15 holiday!</p>
          ) : (
            <p className="text-red-600">❌ August 15 holiday not found</p>
          )}
        </div>

        <details className="mt-4">
          <summary className="cursor-pointer font-semibold">All Holidays (click to expand)</summary>
          <pre className="mt-2 text-sm bg-white p-2 rounded overflow-auto max-h-96">
            {JSON.stringify(holidays, null, 2)}
          </pre>
        </details>
      </div>

      <div className="bg-blue-100 p-4 rounded">
        <h2 className="font-bold">Instructions:</h2>
        <p>1. Open browser console (F12)</p>
        <p>2. Look for logs starting with "DEBUG:"</p>
        <p>3. Check if holidays are being loaded correctly</p>
      </div>
    </div>
  );
}