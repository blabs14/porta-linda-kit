// Script de debug para verificar feriados
// Execute no console do browser na página de timesheet

console.log('=== DEBUG HOLIDAYS ===');

// Verificar se há dados de feriados na base de dados
if (window.supabase) {
  window.supabase
    .from('payroll_holidays')
    .select('*')
    .then(({ data, error }) => {
      if (error) {
        console.error('Erro ao buscar feriados:', error);
      } else {
        console.log('Feriados na base de dados:', data);
      }
    });
} else {
  console.log('Supabase não disponível no window');
}

// Verificar se há entradas marcadas como feriado no timesheet atual
if (window.React && window.React.version) {
  console.log('React disponível, verificar estado do timesheet manualmente');
} else {
  console.log('React não disponível no window');
}

console.log('=== FIM DEBUG HOLIDAYS ===');