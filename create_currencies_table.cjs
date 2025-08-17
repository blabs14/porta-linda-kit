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
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createCurrenciesTable() {
  try {
    console.log('Creating currencies table...');
    
    const createTableSQL = `
      -- Create currencies table
      CREATE TABLE IF NOT EXISTS public.currencies (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        code text UNIQUE NOT NULL,
        name text NOT NULL,
        symbol text NOT NULL,
        rate_to_eur numeric(10,6) DEFAULT 1.0 NOT NULL,
        created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
        updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
      );
      
      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_currencies_code ON public.currencies(code);
      CREATE INDEX IF NOT EXISTS idx_currencies_updated_at ON public.currencies(updated_at);
      
      -- Create update trigger function
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = timezone('utc'::text, now());
        RETURN NEW;
      END;
      $$ language 'plpgsql';
      
      -- Create trigger
      DROP TRIGGER IF EXISTS update_currencies_updated_at ON public.currencies;
      CREATE TRIGGER update_currencies_updated_at
        BEFORE UPDATE ON public.currencies
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
      
      -- Enable RLS
      ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
      
      -- Create policies
      DROP POLICY IF EXISTS "Allow public read access to currencies" ON public.currencies;
      CREATE POLICY "Allow public read access to currencies"
        ON public.currencies FOR SELECT
        USING (true);
      
      DROP POLICY IF EXISTS "Allow authenticated users to manage currencies" ON public.currencies;
      CREATE POLICY "Allow authenticated users to manage currencies"
        ON public.currencies FOR ALL
        USING (auth.role() = 'authenticated');
    `;
    
    const initialCurrencies = [
      { code: 'EUR', name: 'Euro', symbol: '€', rate_to_eur: 1.0 },
      { code: 'USD', name: 'US Dollar', symbol: '$', rate_to_eur: 0.92 },
      { code: 'GBP', name: 'British Pound', symbol: '£', rate_to_eur: 1.18 },
      { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', rate_to_eur: 0.16 },
      { code: 'AOA', name: 'Angolan Kwanza', symbol: 'Kz', rate_to_eur: 0.0011 },
      { code: 'CVE', name: 'Cape Verdean Escudo', symbol: '$', rate_to_eur: 0.009 },
      { code: 'MZN', name: 'Mozambican Metical', symbol: 'MT', rate_to_eur: 0.016 }
    ];
    
    // First, try to check if table exists
     console.log('Checking if currencies table exists...');
     const { data: testData, error: testError } = await supabase
       .from('currencies')
       .select('*')
       .limit(1);
     
     console.log('Test query result:', { data: testData, error: testError });
 
     if (testError && (testError.code === 'PGRST106' || testError.code === '42P01')) {
      console.log('Table does not exist. Creating via REST API...');
      
      // Use the REST API directly to execute SQL
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey
        },
        body: JSON.stringify({ sql: createTableSQL })
      });

      if (!response.ok) {
        console.log('SQL RPC not available. Please create the table manually.');
        console.log('\n⚠️  Please create the currencies table manually in Supabase Dashboard:');
        console.log('\n1. Go to your Supabase project dashboard');
        console.log('2. Navigate to SQL Editor');
        console.log('3. Run the following SQL:');
        console.log('\n' + createTableSQL);
        return;
      }
      
      console.log('✅ Table created via REST API!');
      
      // Insert initial data
      console.log('Inserting initial currency data...');
      const { data: insertData, error: insertError } = await supabase
        .from('currencies')
        .insert(initialCurrencies);

      if (insertError) {
         console.error('Error inserting currency data:', insertError);
         console.log('Full error details:', JSON.stringify(insertError, null, 2));
         return;
       }
      
      console.log('✅ Initial currency data inserted successfully!');
    } else {
      console.log('Table already exists. Checking for data...');
      
      if (testData && testData.length > 0) {
        console.log('✅ Table already has data. Setup complete!');
        return;
      }
      
      // Insert initial data if table exists but is empty
      console.log('Inserting initial currency data...');
      const { data: insertData, error: insertError } = await supabase
        .from('currencies')
        .insert(initialCurrencies);

      if (insertError) {
        console.error('Error inserting currency data:', insertError);
        return;
      }
      
      console.log('✅ Initial currency data inserted successfully!');
    }
    
    // Verify the table was created
    const { data: currencies, error: selectError } = await supabase
      .from('currencies')
      .select('*')
      .limit(5);
    
    if (selectError) {
      console.error('Error verifying table:', selectError);
      return;
    }
    
    console.log('✅ Table verification successful. Sample currencies:');
    console.table(currencies);
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createCurrenciesTable();