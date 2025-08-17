const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local file manually
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n');

let supabaseUrl, supabaseServiceKey;
envLines.forEach(line => {
  if (line.startsWith('SUPABASE_URL=')) {
    supabaseUrl = line.split('=')[1].trim();
  }
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
    supabaseServiceKey = line.split('=')[1].trim();
  }
});

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createCurrenciesTable() {
  try {
    console.log('Creating currencies table via SQL...');
    
    // Use the SQL function to create table
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
    
    // Try using the sql function
    const { data, error } = await supabase.rpc('sql', {
      query: createTableSQL
    });
    
    if (error) {
      console.error('Error creating table via sql function:', error);
      
      // Try alternative approach - use fetch directly
      console.log('Trying direct SQL execution...');
      
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey
        },
        body: JSON.stringify({ query: createTableSQL })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Direct SQL execution failed:', errorText);
        
        console.log('\n⚠️  Please create the currencies table manually in Supabase Dashboard:');
        console.log('\n1. Go to https://supabase.com/dashboard/project/ebitcwrrcumsvqjgrapw');
        console.log('2. Navigate to SQL Editor');
        console.log('3. Run the following SQL:');
        console.log('\n' + createTableSQL);
        return;
      }
      
      console.log('✅ Table created via direct SQL execution!');
    } else {
      console.log('✅ Table created via sql RPC function!');
    }
    
    // Now insert the initial data
    const initialCurrencies = [
      { code: 'EUR', name: 'Euro', symbol: '€', rate_to_eur: 1.0 },
      { code: 'USD', name: 'US Dollar', symbol: '$', rate_to_eur: 0.92 },
      { code: 'GBP', name: 'British Pound', symbol: '£', rate_to_eur: 1.18 },
      { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', rate_to_eur: 0.16 },
      { code: 'AOA', name: 'Angolan Kwanza', symbol: 'Kz', rate_to_eur: 0.0011 },
      { code: 'CVE', name: 'Cape Verdean Escudo', symbol: '$', rate_to_eur: 0.009 },
      { code: 'MZN', name: 'Mozambican Metical', symbol: 'MT', rate_to_eur: 0.016 }
    ];
    
    console.log('Inserting initial currency data...');
    const { data: insertData, error: insertError } = await supabase
      .from('currencies')
      .insert(initialCurrencies)
      .select();
    
    if (insertError) {
      console.error('Error inserting currency data:', insertError);
    } else {
      console.log('✅ Initial currency data inserted successfully!');
      console.log('Inserted currencies:', insertData?.map(c => c.code).join(', '));
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createCurrenciesTable();