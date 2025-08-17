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

async function applyCurrenciesMigration() {
  try {
    console.log('Applying currencies migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20250117000000_currencies_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Migration SQL loaded, executing...');
    
    // Try to execute the SQL using fetch directly
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ 
        sql: migrationSQL 
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to execute migration:', response.status, errorText);
      
      // Try alternative approach with supabase client
      console.log('Trying alternative approach...');
      
      // Split the SQL into individual statements and execute them
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.trim()) {
          console.log('Executing:', statement.substring(0, 50) + '...');
          
          try {
            const { error } = await supabase.rpc('exec_sql', {
              sql: statement + ';'
            });
            
            if (error) {
              console.error('Error executing statement:', error);
              // Continue with next statement
            } else {
              console.log('✅ Statement executed successfully');
            }
          } catch (err) {
            console.error('Exception executing statement:', err);
            // Continue with next statement
          }
        }
      }
      
      return;
    }
    
    console.log('✅ Migration executed successfully!');
    
    // Verify the table was created
    const { data, error } = await supabase
      .from('currencies')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('Error verifying table:', error);
    } else {
      console.log('✅ Table verification successful!');
      console.log('Sample currencies:', data);
    }
    
  } catch (error) {
    console.error('Error applying migration:', error);
  }
}

applyCurrenciesMigration();