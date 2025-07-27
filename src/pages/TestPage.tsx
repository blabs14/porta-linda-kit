import React from 'react';

const TestPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 text-green-600">✅ Aplicação Funcional!</h1>
        <p className="text-xl text-muted-foreground mb-4">
          A aplicação está a funcionar corretamente
        </p>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            • React Router funcionando
          </p>
          <p className="text-sm text-muted-foreground">
            • Tailwind CSS aplicado
          </p>
          <p className="text-sm text-muted-foreground">
            • Componentes carregados
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestPage; 