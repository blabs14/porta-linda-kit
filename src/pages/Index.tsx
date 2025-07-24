import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
// Update this page (the content is just a fallback if you fail to update the page)

const Index = () => {
  useEffect(() => {
    const fetchAccounts = async () => {
      const { data, error } = await supabase.from('accounts').select();
      if (error) {
        console.error('Erro ao buscar contas:', error);
      } else {
        console.log('Dados da tabela accounts:', data);
      }
    };
    fetchAccounts();
  }, []);
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to Your Blank App</h1>
        <p className="text-xl text-muted-foreground">Start building your amazing project here!</p>
      </div>
    </div>
  );
};

export default Index;
