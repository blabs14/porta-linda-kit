const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCurrenciesInsert() {
  try {
    console.log('🔄 Testing currencies table access...');
    
    // First, try to read from the table to see if it exists
    const { data: existingData, error: readError } = await supabase
      .from('currencies')
      .select('code')
      .limit(1);
    
    if (readError) {
      console.log('❌ Table does not exist or is not accessible:', readError.message);
      console.log('\n📋 Please create the currencies table manually in Supabase Dashboard:');
      console.log('\n1. Go to https://supabase.com/dashboard/project/ebitcwrrcumsvqjgrapw');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Run this SQL:');
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
      return;
    }
    
    console.log('✅ Table exists and is accessible!');
    console.log('📊 Current data:', existingData);
    
    // Try to insert some test data
    const currencies = [
      { code: 'EUR', name: 'Euro', symbol: '€', rate_to_eur: 1.0 },
      { code: 'USD', name: 'US Dollar', symbol: '$', rate_to_eur: 0.92 },
      { code: 'GBP', name: 'British Pound', symbol: '£', rate_to_eur: 1.18 }
    ];
    
    console.log('🔄 Attempting to insert/update currency data...');
    
    const { data: insertData, error: insertError } = await supabase
      .from('currencies')
      .upsert(currencies, { onConflict: 'code' })
      .select();
    
    if (insertError) {
      console.log('❌ Insert failed:', insertError.message);
    } else {
      console.log('✅ Data inserted/updated successfully!');
      console.log('📊 Inserted data:', insertData);
    }
    
    // Verify final state
    const { data: finalData, error: finalError } = await supabase
      .from('currencies')
      .select('code, name, symbol')
      .order('code');
    
    if (finalError) {
      console.log('❌ Final verification failed:', finalError.message);
    } else {
      console.log('✅ Final table state:');
      console.table(finalData);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

testCurrenciesInsert();