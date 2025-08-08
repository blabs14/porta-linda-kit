import { z } from 'zod';

// Schema de validação para transações
export const transactionValidationSchema = z.object({
  account_id: z.string().uuid('ID da conta deve ser um UUID válido'),
  valor: z.number().positive('Valor deve ser positivo').max(999999.99, 'Valor máximo é 999.999,99'),
  categoria_id: z.string().uuid('ID da categoria deve ser um UUID válido'),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  descricao: z.string().max(255, 'Descrição deve ter no máximo 255 caracteres').optional(),
  tipo: z.enum(['receita', 'despesa'], {
    errorMap: () => ({ message: 'Tipo deve ser "receita" ou "despesa"' })
  }),
});

// Schema de validação para contas
export const accountValidationSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome deve ter no máximo 100 caracteres'),
  tipo: z.enum(['corrente', 'poupança', 'investimento', 'outro'], {
    errorMap: () => ({ message: 'Tipo deve ser "corrente", "poupança", "investimento" ou "outro"' })
  }),
});

// Schema de validação para categorias
export const categoryValidationSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome deve ter no máximo 100 caracteres'),
  tipo: z.enum(['despesa', 'receita', 'poupança', 'investimento', 'outro'], {
    errorMap: () => ({ message: 'Tipo deve ser "despesa", "receita", "poupança", "investimento" ou "outro"' })
  }),
  cor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Cor deve ser um código hexadecimal válido').optional(),
});

// Schema de validação para objetivos
export const goalValidationSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome deve ter no máximo 100 caracteres'),
  valor_objetivo: z.number().positive('Valor objetivo deve ser positivo').max(999999.99, 'Valor máximo é 999.999,99'),
  prazo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Prazo deve estar no formato YYYY-MM-DD').optional(),
  account_id: z.string().uuid('ID da conta deve ser um UUID válido').optional(),
});

export type TransactionInput = Partial<z.input<typeof transactionValidationSchema>> & {
  valor: number | string;
};
export type AccountInput = z.input<typeof accountValidationSchema>;
export type CategoryInput = z.input<typeof categoryValidationSchema>;
export type GoalInput = Partial<z.input<typeof goalValidationSchema>> & {
  valor_objetivo: number | string;
};

export interface ValidationResponse<T> {
  success: boolean;
  data: T | null;
  errors: { field: string; message: string }[] | null;
}

// Função para sanitizar strings
export const sanitizeString = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove caracteres potencialmente perigosos
    .replace(/\s+/g, ' ') // Normaliza espaços
    .substring(0, 255); // Limita tamanho
};

// Função para sanitizar números
export const sanitizeNumber = (input: number): number => {
  return Math.round(input * 100) / 100; // Arredonda para 2 casas decimais
};

// Função para validar e sanitizar dados de transação
export const validateAndSanitizeTransaction = (data: TransactionInput): ValidationResponse<z.output<typeof transactionValidationSchema>> => {
  try {
    // Sanitizar inputs
    const sanitizedData = {
      account_id: data.account_id as string,
      valor: sanitizeNumber(Number(data.valor)),
      categoria_id: data.categoria_id as string,
      data: data.data as string,
      descricao: data.descricao ? sanitizeString(data.descricao) : undefined,
      tipo: Number(data.valor) > 0 ? 'receita' as const : 'despesa' as const,
    };

    // Validar com Zod
    const validatedData = transactionValidationSchema.parse(sanitizedData);
    
    return {
      success: true,
      data: validatedData,
      errors: null,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      };
    }
    
    return {
      success: false,
      data: null,
      errors: [{ field: 'unknown', message: 'Erro de validação desconhecido' }],
    };
  }
};

// Função para validar e sanitizar dados de conta
export const validateAndSanitizeAccount = (data: AccountInput): ValidationResponse<z.output<typeof accountValidationSchema>> => {
  try {
    // Sanitizar inputs
    const sanitizedData = {
      nome: sanitizeString(data.nome),
      tipo: data.tipo,
    };

    // Validar com Zod
    const validatedData = accountValidationSchema.parse(sanitizedData);
    
    return {
      success: true,
      data: validatedData,
      errors: null,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      };
    }
    
    return {
      success: false,
      data: null,
      errors: [{ field: 'unknown', message: 'Erro de validação desconhecido' }],
    };
  }
};

// Função para validar e sanitizar dados de categoria
export const validateAndSanitizeCategory = (data: CategoryInput): ValidationResponse<z.output<typeof categoryValidationSchema>> => {
  try {
    // Sanitizar inputs
    const sanitizedData = {
      nome: sanitizeString(data.nome),
      tipo: data.tipo,
      cor: data.cor || '#3B82F6',
    };

    // Validar com Zod
    const validatedData = categoryValidationSchema.parse(sanitizedData);
    
    return {
      success: true,
      data: validatedData,
      errors: null,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      };
    }
    
    return {
      success: false,
      data: null,
      errors: [{ field: 'unknown', message: 'Erro de validação desconhecido' }],
    };
  }
};

// Função para validar e sanitizar dados de objetivo
export const validateAndSanitizeGoal = (data: GoalInput): ValidationResponse<z.output<typeof goalValidationSchema>> => {
  try {
    // Sanitizar inputs
    const sanitizedData = {
      nome: sanitizeString(data.nome as string),
      valor_objetivo: sanitizeNumber(Number(data.valor_objetivo)),
      prazo: data.prazo || undefined,
      account_id: data.account_id,
    };

    // Validar com Zod
    const validatedData = goalValidationSchema.parse(sanitizedData);
    
    return {
      success: true,
      data: validatedData,
      errors: null,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      };
    }
    
    return {
      success: false,
      data: null,
      errors: [{ field: 'unknown', message: 'Erro de validação desconhecido' }],
    };
  }
};

// Função para validar UUID
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Função para validar email
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Função para validar data
export const isValidDate = (date: string): boolean => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;
  
  const dateObj = new Date(date);
  return dateObj instanceof Date && !isNaN(dateObj.getTime());
};

// Função para validar se uma data é futura
export const isFutureDate = (date: string): boolean => {
  const dateObj = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dateObj > today;
};

// Função para validar se uma data é passada
export const isPastDate = (date: string): boolean => {
  const dateObj = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dateObj < today;
}; 