# Padrões de Validação - Family Finance

## Visão Geral

Este documento define os padrões de validação utilizados na aplicação Family Finance, garantindo consistência e qualidade na validação de dados em todos os formulários.

## Stack de Validação

- **Zod**: Biblioteca principal para definição de schemas e validação
- **React Hook Form**: Gerenciamento de formulários com integração ao Zod via `zodResolver`
- **shadcn/ui Form**: Componentes de UI padronizados para formulários

## Estrutura de Arquivos

```
src/
├── validation/
│   ├── schemas/
│   │   ├── authSchema.ts      # Schemas de autenticação
│   │   ├── budgetSchema.ts    # Schemas de orçamentos
│   │   └── transactionSchema.ts # Schemas de transações
│   └── __tests__/
│       ├── authSchema.test.ts
│       ├── budgetSchema.test.ts
│       └── transactionSchema.test.ts
├── components/
│   ├── forms/
│   │   ├── BudgetForm.tsx
│   │   ├── TransactionForm.tsx
│   │   └── auth/
│   │       ├── LoginForm.tsx
│   │       └── RegisterForm.tsx
```

## Padrão de Implementação

### 1. Definição do Schema

```typescript
// src/validation/schemas/exampleSchema.ts
import { z } from 'zod';

export const exampleSchema = z.object({
  // Campos obrigatórios com validações específicas
  name: z.string()
    .min(1, 'Nome é obrigatório')
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .trim(),
  
  email: z.string()
    .min(1, 'Email é obrigatório')
    .email('Email deve ter um formato válido')
    .toLowerCase()
    .trim(),
  
  // Validações condicionais
  value: z.number()
    .positive('Valor deve ser maior que 0')
    .transform(val => Number(val.toFixed(2))),
  
  // Enums para valores específicos
  type: z.enum(['option1', 'option2'], {
    errorMap: () => ({ message: 'Tipo deve ser option1 ou option2' })
  }),
  
  // Datas no formato ISO
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
});

// Tipo TypeScript derivado do schema
export type ExampleFormData = z.infer<typeof exampleSchema>;
```

### 2. Implementação do Componente

```typescript
// src/components/forms/ExampleForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { exampleSchema, type ExampleFormData } from '@/validation/schemas/exampleSchema';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ExampleFormProps {
  onSubmit: (data: ExampleFormData) => Promise<void>;
  initialData?: Partial<ExampleFormData>;
  isLoading?: boolean;
}

export function ExampleForm({ onSubmit, initialData, isLoading }: ExampleFormProps) {
  const form = useForm<ExampleFormData>({
    resolver: zodResolver(exampleSchema),
    defaultValues: {
      name: '',
      email: '',
      value: 0,
      type: 'option1',
      date: new Date().toISOString().split('T')[0],
      ...initialData,
    },
  });

  const handleSubmit = async (data: ExampleFormData) => {
    try {
      await onSubmit(data);
      form.reset();
    } catch (error) {
      console.error('Erro ao submeter formulário:', error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Digite o nome" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Outros campos... */}
        
        <div className="flex gap-2">
          <Button 
            type="submit" 
            disabled={isLoading || form.formState.isSubmitting}
          >
            {isLoading || form.formState.isSubmitting ? 'Salvando...' : 'Salvar'}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => form.reset()}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

### 3. Testes Unitários

```typescript
// src/validation/__tests__/exampleSchema.test.ts
import { describe, it, expect } from 'vitest';
import { exampleSchema } from '../schemas/exampleSchema';

describe('exampleSchema', () => {
  describe('validação básica', () => {
    it('deve validar dados válidos', () => {
      const validData = {
        name: 'João Silva',
        email: 'joao@exemplo.com',
        value: 100.50,
        type: 'option1',
        date: '2024-01-15'
      };

      const result = exampleSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('validação de campos obrigatórios', () => {
    it('deve rejeitar campos vazios', () => {
      const invalidData = {
        name: '',
        email: '',
        value: 0,
        type: 'option1',
        date: '2024-01-15'
      };

      const result = exampleSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  // Mais testes específicos...
});
```

## Convenções de Mensagens de Erro

### Campos Obrigatórios
- `"[Campo] é obrigatório"`
- Exemplo: `"Nome é obrigatório"`

### Validações de Tamanho
- Mínimo: `"[Campo] deve ter pelo menos [N] caracteres"`
- Máximo: `"[Campo] deve ter no máximo [N] caracteres"`

### Validações de Formato
- Email: `"Email deve ter um formato válido"`
- Data: `"Data deve estar no formato YYYY-MM-DD"`
- Número: `"[Campo] deve ser um número válido"`

### Validações de Valor
- Positivo: `"[Campo] deve ser maior que 0"`
- Enum: `"[Campo] deve ser [opção1] ou [opção2]"`

## Transformações Padrão

### Strings
- `.trim()`: Remove espaços em branco no início e fim
- `.toLowerCase()`: Converte para minúsculas (emails)

### Números
- `.transform(val => Number(val.toFixed(2)))`: Arredonda para 2 casas decimais

### Datas
- Formato padrão: `YYYY-MM-DD`
- Regex de validação: `/^\d{4}-\d{2}-\d{2}$/`

## Validações Condicionais

```typescript
// Exemplo de validação condicional
const conditionalSchema = z.object({
  period: z.enum(['mensal', 'anual']),
  month: z.number().optional(),
  year: z.number()
}).refine(
  (data) => {
    if (data.period === 'mensal') {
      return data.month !== undefined && data.month >= 1 && data.month <= 12;
    }
    return true;
  },
  {
    message: 'Mês é obrigatório quando o período é mensal',
    path: ['month']
  }
);
```

## Integração com React Hook Form

### Configuração Básica
```typescript
const form = useForm<FormData>({
  resolver: zodResolver(schema),
  defaultValues: {
    // Valores padrão
  },
  mode: 'onChange', // Validação em tempo real
});
```

### Observação de Mudanças
```typescript
const watchedValues = form.watch();

// Para campos específicos
const period = form.watch('period');
```

### Reset e Atualização
```typescript
// Reset completo
form.reset();

// Reset com novos valores
form.reset(newDefaultValues);

// Atualização de campo específico
form.setValue('fieldName', newValue);
```

## Componentes de UI Padronizados

### FormField
```typescript
<FormField
  control={form.control}
  name="fieldName"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Label</FormLabel>
      <FormControl>
        <Input {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Select
```typescript
<FormField
  control={form.control}
  name="selectField"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Opção</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma opção" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="option1">Opção 1</SelectItem>
          <SelectItem value="option2">Opção 2</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

## Boas Práticas

### 1. Schemas
- Mantenha schemas em arquivos separados por domínio
- Use transformações para normalizar dados
- Defina mensagens de erro claras e consistentes
- Exporte tipos TypeScript derivados dos schemas

### 2. Componentes
- Use `zodResolver` para integração com React Hook Form
- Implemente estados de loading e erro
- Forneça valores padrão apropriados
- Use `FormField` para consistência visual

### 3. Testes
- Teste casos válidos e inválidos
- Cubra validações condicionais
- Teste transformações de dados
- Verifique mensagens de erro específicas

### 4. Performance
- Use `mode: 'onChange'` apenas quando necessário
- Considere `mode: 'onBlur'` para formulários complexos
- Implemente debounce para validações custosas

## Exemplos de Uso

### Formulário Simples
```typescript
// Schema
export const contactSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').trim(),
  email: z.string().email('Email inválido').toLowerCase().trim(),
  message: z.string().min(10, 'Mensagem deve ter pelo menos 10 caracteres')
});

// Componente
export function ContactForm() {
  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', email: '', message: '' }
  });

  // Implementação...
}
```

### Formulário com Validação Condicional
```typescript
// Schema com validação condicional
export const budgetSchema = z.object({
  category_id: z.string().min(1, 'Categoria é obrigatória'),
  value: z.number().positive('Valor deve ser maior que 0'),
  period: z.enum(['mensal', 'anual']),
  month: z.number().min(1).max(12).optional(),
  year: z.number().min(2020).max(2030)
}).refine(
  (data) => data.period !== 'mensal' || data.month !== undefined,
  { message: 'Mês é obrigatório para período mensal', path: ['month'] }
);
```

## Migração de Formulários Existentes

### Checklist de Migração
1. ✅ Criar schema Zod correspondente
2. ✅ Substituir `useState` por `useForm`
3. ✅ Implementar `zodResolver`
4. ✅ Migrar JSX para usar componentes `FormField`
5. ✅ Remover validação manual
6. ✅ Criar testes unitários
7. ✅ Testar integração completa

### Antes (Padrão Antigo)
```typescript
const [formData, setFormData] = useState({ name: '', email: '' });
const [errors, setErrors] = useState({});

const handleSubmit = (e) => {
  e.preventDefault();
  const validationErrors = validateForm(formData);
  if (Object.keys(validationErrors).length > 0) {
    setErrors(validationErrors);
    return;
  }
  // Submit...
};
```

### Depois (Padrão Novo)
```typescript
const form = useForm<FormData>({
  resolver: zodResolver(schema),
  defaultValues: { name: '', email: '' }
});

const handleSubmit = async (data: FormData) => {
  // Submit direto com dados validados
};
```

## Recursos Adicionais

- [Documentação do Zod](https://zod.dev/)
- [React Hook Form](https://react-hook-form.com/)
- [shadcn/ui Form](https://ui.shadcn.com/docs/components/form)
- [Guia de Testes com Vitest](https://vitest.dev/guide/)

---

**Última atualização**: Janeiro 2024  
**Versão**: 1.0.0