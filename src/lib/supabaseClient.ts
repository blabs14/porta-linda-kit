import { createClient } from '@supabase/supabase-js';
import { Database } from '../integrations/supabase/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ebitcwrrcumsvqjgrapw.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViaXRjd3JyY3Vtc3ZxamdyYXB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NjcyMTYsImV4cCI6MjA2ODM0MzIxNn0.hLlTeSD2VzVCjvUSXLYQypXNYqthDx0q1N86aOftfEY';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);