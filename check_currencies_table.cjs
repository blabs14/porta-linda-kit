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

async function checkAndCreateTable() {
  try {
    console.log('Checking if currencies table exists...');
    
    // Try to select from the table
    const { data, error } = await supabase
      .from('currencies')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('Table does not exist. Error:', error.message);
      console.log('\n⚠️  Please create the currencies table manually in Supabase Dashboard:');
      console.log('\n1. Go to https://supabase.com/dashboard/project/ebitcwrrcumsvqjgrapw');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Run the following SQL:');
      console.log(`
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

-- Insert initial data
INSERT INTO public.currencies (code, name, symbol, rate_to_eur) VALUES
('EUR', 'Euro', '€', 1.0),
('USD', 'US Dollar', '$', 0.92),
('GBP', 'British Pound', '£', 1.18),
('BRL', 'Brazilian Real', 'R$', 0.16),
('AOA', 'Angolan Kwanza', 'Kz', 0.0011),
('CVE', 'Cape Verdean Escudo', '$', 0.009),
('MZN', 'Mozambican Metical', 'MT', 0.016)
ON CONFLICT (code) DO NOTHING;`);
      console.log('\n4. After running the SQL, the table will be created with initial data.');
      return false;
    } else {
      console.log('✅ Table exists! Found', data?.length || 0, 'currencies');
      if (data && data.length > 0) {
        console.log('Existing currencies:', data.map(c => c.code).join(', '));
      }
      return true;
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return false;
  }
}

checkAndCreateTable();