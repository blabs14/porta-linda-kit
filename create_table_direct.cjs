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

async function createTableDirectly() {
  try {
    console.log('Creating currencies table via direct API...');
    
    // First, let's try to create the table using the database URL directly
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
    
    // Try using the query endpoint
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ 
        sql: createTableSQL 
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to create table:', response.status, errorText);
      
      console.log('\n📋 Manual Setup Required:');
      console.log('\n1. Go to: https://supabase.com/dashboard/project/ebitcwrrcumsvqjgrapw/sql');
      console.log('2. Run this SQL:');
      console.log('\n' + createTableSQL);
      console.log('\n3. Then run this script again to insert the data.');
      return false;
    }
    
    console.log('✅ Table created successfully!');
    return true;
    
  } catch (error) {
    console.error('Error creating table:', error);
    return false;
  }
}

async function insertInitialData() {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
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
    const { data, error } = await supabase
      .from('currencies')
      .insert(initialCurrencies)
      .select();
    
    if (error) {
      console.error('Error inserting data:', error);
      return false;
    }
    
    console.log('✅ Initial currency data inserted successfully!');
    console.log('Inserted currencies:', data?.map(c => c.code).join(', '));
    return true;
    
  } catch (error) {
    console.error('Error inserting data:', error);
    return false;
  }
}

async function main() {
  const tableCreated = await createTableDirectly();
  
  if (tableCreated) {
    await insertInitialData();
  }
}

main();