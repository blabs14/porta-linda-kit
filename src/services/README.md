# Serviços da Aplicação

## ExportService

O `ExportService` é responsável por gerar relatórios financeiros em diferentes formatos (PDF, CSV, Excel) com base nos dados das transações do utilizador.

### Funcionalidades

- **Exportação em PDF**: Gera relatórios formatados com tabelas e estatísticas
- **Exportação em CSV**: Dados em formato de texto separado por vírgulas
- **Exportação em Excel**: Múltiplas folhas com dados e estatísticas
- **Suporte a múltiplas moedas**: Configurável via opções
- **Suporte a múltiplos idiomas**: Configurável via opções
- **Filtros por período**: Exportação baseada em intervalo de datas

### Como usar

#### Hook useExportReport

```typescript
import { useExportReport } from '../hooks/useExportReport';

const MyComponent = () => {
  const { downloadReport, isExporting } = useExportReport();

  const handleExport = async () => {
    await downloadReport({
      format: 'pdf',
      dateRange: {
        start: '2024-01-01',
        end: '2024-01-31'
      },
      currency: 'EUR',
      locale: 'pt-PT'
    });
  };

  return (
    <button onClick={handleExport} disabled={isExporting}>
      {isExporting ? 'A exportar...' : 'Exportar PDF'}
    </button>
  );
};
```

#### Uso direto do serviço

```typescript
import { exportReport } from '../services/exportService';

const handleExport = async () => {
  const result = await exportReport(userId, {
    format: 'excel',
    dateRange: {
      start: '2024-01-01',
      end: '2024-01-31'
    },
    includeCharts: true
  });

  if (result.error) {
    console.error('Erro:', result.error);
    return;
  }

  // Download do ficheiro
  const { blob, filename } = result.data;
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
};
```

### Formatos suportados

#### PDF
- Título e período do relatório
- Resumo financeiro (receitas, despesas, saldo)
- Tabela de transações
- Estatísticas por categoria
- Formatação profissional

#### CSV
- Dados das transações em formato de texto
- Cabeçalhos: Data, Descrição, Tipo, Valor, Categoria, Conta
- Compatível com Excel e outras ferramentas

#### Excel
- Folha "Transações": Lista completa de transações
- Folha "Estatísticas por Categoria": Resumo por categoria
- Folha "Resumo": Totais gerais
- Formatação automática

### Opções de configuração

```typescript
interface ExportOptions {
  format: 'pdf' | 'csv' | 'excel';
  dateRange: {
    start: string; // YYYY-MM-DD
    end: string;   // YYYY-MM-DD
  };
  includeCharts?: boolean; // Para futuras implementações
  currency?: string;        // Padrão: 'EUR'
  locale?: string;          // Padrão: 'pt-PT'
}
```

### Estrutura de dados

O serviço trabalha com os seguintes tipos de dados:

```typescript
interface Transaction {
  id: string;
  data: string;
  descricao: string | null;
  valor: number;
  tipo: string;
  categoria_nome: string;
  account_nome: string;
  // ... outros campos
}

interface ExportData {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  dateRange: {
    start: string;
    end: string;
  };
}
```

### Tratamento de erros

O serviço retorna sempre um objeto com a seguinte estrutura:

```typescript
interface ExportResult {
  data: { blob: Blob; filename: string } | null;
  error: any;
}
```

### Componente ReportExport

O componente `ReportExport` fornece uma interface de utilizador completa para exportação:

- Seletor de formato (PDF, CSV, Excel)
- Seleção de período com opções rápidas
- Datas personalizadas
- Indicador de carregamento
- Feedback visual com toasts

### Melhorias futuras

- [ ] Suporte a gráficos nos relatórios PDF
- [ ] Templates personalizáveis
- [ ] Exportação de outros tipos de dados (orçamentos, objetivos)
- [ ] Compressão de ficheiros grandes
- [ ] Exportação em lote
- [ ] Agendamento de relatórios
- [ ] Envio por email

### Dependências

- `jspdf`: Geração de PDFs
- `jspdf-autotable`: Tabelas em PDF
- `xlsx`: Geração de ficheiros Excel
- `supabase`: Acesso aos dados

### Testes

Os testes estão localizados em `exportService.test.ts` e cobrem:

- Geração de PDF, CSV e Excel
- Validação de parâmetros
- Tratamento de erros
- Estrutura de dados retornada 