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

const initialCurrencies = [
  { code: 'EUR', name: 'Euro', symbol: '€', rate_to_eur: 1.0 },
  { code: 'USD', name: 'US Dollar', symbol: '$', rate_to_eur: 0.92 },
  { code: 'GBP', name: 'British Pound', symbol: '£', rate_to_eur: 1.18 },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', rate_to_eur: 0.16 },
  { code: 'AOA', name: 'Angolan Kwanza', symbol: 'Kz', rate_to_eur: 0.0011 },
  { code: 'CVE', name: 'Cape Verdean Escudo', symbol: '$', rate_to_eur: 0.009 },
  { code: 'MZN', name: 'Mozambican Metical', symbol: 'MT', rate_to_eur: 0.016 }
];

async function insertCurrencies() {
  try {
    console.log('Inserting currency data...');
    
    // Try to insert each currency individually to see which ones fail
    for (const currency of initialCurrencies) {
      console.log(`Inserting ${currency.code}...`);
      const { data, error } = await supabase
        .from('currencies')
        .insert([currency])
        .select();
      
      if (error) {
        console.error(`Error inserting ${currency.code}:`, error);
      } else {
        console.log(`✅ ${currency.code} inserted successfully`);
      }
    }
    
    console.log('Currency insertion process complete!');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

insertCurrencies();