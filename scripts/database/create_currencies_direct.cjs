const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createCurrenciesTable() {
  try {
    console.log('🔄 Creating currencies table...');
    
    // Simple SQL to create table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.currencies (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        code text UNIQUE NOT NULL,
        name text NOT NULL,
        symbol text NOT NULL,
        rate_to_eur numeric(10,6) DEFAULT 1.0 NOT NULL,
        created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
        updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_currencies_code ON public.currencies(code);
      CREATE INDEX IF NOT EXISTS idx_currencies_updated_at ON public.currencies(updated_at);
      
      ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
      
      DROP POLICY IF EXISTS "Allow public read access to currencies" ON public.currencies;
      CREATE POLICY "Allow public read access to currencies"
        ON public.currencies FOR SELECT
        USING (true);
      
      DROP POLICY IF EXISTS "Allow authenticated users to manage currencies" ON public.currencies;
      CREATE POLICY "Allow authenticated users to manage currencies"
        ON public.currencies FOR ALL
        USING (auth.role() = 'authenticated');
    `;
    
    // Try direct SQL execution via fetch
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ sql: createTableSQL })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    
    console.log('✅ Table creation SQL executed');
    
    // Insert initial data
    const currencies = [
      { code: 'EUR', name: 'Euro', symbol: '€', rate_to_eur: 1.0 },
      { code: 'USD', name: 'US Dollar', symbol: '$', rate_to_eur: 0.92 },
      { code: 'GBP', name: 'British Pound', symbol: '£', rate_to_eur: 1.18 },
      { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', rate_to_eur: 0.16 },
      { code: 'AOA', name: 'Angolan Kwanza', symbol: 'Kz', rate_to_eur: 0.0011 },
      { code: 'CVE', name: 'Cape Verdean Escudo', symbol: '$', rate_to_eur: 0.009 },
      { code: 'MZN', name: 'Mozambican Metical', symbol: 'MT', rate_to_eur: 0.016 }
    ];
    
    console.log('🔄 Inserting initial currency data...');
    
    const { data, error } = await supabase
      .from('currencies')
      .upsert(currencies, { onConflict: 'code' });
    
    if (error) {
      console.log('⚠️ Insert error (table might not exist yet):', error.message);
    } else {
      console.log('✅ Initial currency data inserted successfully!');
    }
    
    // Verify table exists
    const { data: testData, error: testError } = await supabase
      .from('currencies')
      .select('code, name')
      .limit(3);
    
    if (testError) {
      console.log('❌ Table verification failed:', testError.message);
      console.log('\n📋 Please create the table manually in Supabase Dashboard');
    } else {
      console.log('✅ Currencies table verified!');
      console.log('📊 Sample currencies:', testData);
    }
    
  } catch (error) {
    console.error('❌ Failed to create currencies table:', error.message);
    console.log('\n📋 Please create the table manually in Supabase Dashboard');
  }
}

createCurrenciesTable();