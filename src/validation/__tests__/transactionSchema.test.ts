import { describe, it, expect } from 'vitest';
import { transactionSchema } from '../transactionSchema';

describe('transactionSchema', () => {
  describe('validação básica', () => {
    it('deve validar uma transação de receita válida', () => {
      const validTransaction = {
        account_id: 'acc-123',
        categoria_id: 'cat-456',
        tipo: 'receita' as const,
        valor: 1500.75,
        descricao: 'Salário mensal',
        data: '2024-01-15'
      };

      const result = transactionSchema.safeParse(validTransaction);
      expect(result.success).toBe(true);
    });

    it('deve validar uma transação de despesa válida', () => {
      const validTransaction = {
        account_id: 'acc-123',
        categoria_id: 'cat-789',
        tipo: 'despesa' as const,
        valor: 50.25,
        descricao: 'Compras no supermercado',
        data: '2024-01-15'
      };

      const result = transactionSchema.safeParse(validTransaction);
      expect(result.success).toBe(true);
    });
  });

  describe('validação de account_id', () => {
    it('deve rejeitar account_id vazio', () => {
      const invalidTransaction = {
        account_id: '',
        categoria_id: 'cat-456',
        tipo: 'receita' as const,
        valor: 100,
        descricao: 'Teste',
        data: '2024-01-15'
      };

      const result = transactionSchema.safeParse(invalidTransaction);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Conta obrigatória');
      }
    });

    it('deve rejeitar account_id ausente', () => {
      const invalidTransaction = {
        categoria_id: 'cat-456',
        tipo: 'receita' as const,
        valor: 100,
        descricao: 'Teste',
        data: '2024-01-15'
      };

      const result = transactionSchema.safeParse(invalidTransaction);
      expect(result.success).toBe(false);
    });
  });

  describe('validação de category_id', () => {
    it('deve rejeitar category_id vazio', () => {
      const invalidTransaction = {
        account_id: 'acc-123',
        categoria_id: '',
        tipo: 'receita' as const,
        valor: 100,
        descricao: 'Teste',
        data: '2024-01-15'
      };

      const result = transactionSchema.safeParse(invalidTransaction);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Categoria obrigatória');
      }
    });

    it('deve rejeitar category_id ausente', () => {
      const invalidTransaction = {
        account_id: 'acc-123',
        tipo: 'receita' as const,
        valor: 100,
        descricao: 'Teste',
        data: '2024-01-15'
      };

      const result = transactionSchema.safeParse(invalidTransaction);
      expect(result.success).toBe(false);
    });
  });

  describe('validação de tipo', () => {
    it('deve aceitar apenas "receita" ou "despesa"', () => {
      const receitaTransaction = {
        account_id: 'acc-123',
        categoria_id: 'cat-456',
        tipo: 'receita' as const,
        valor: 100,
        descricao: 'Teste',
        data: '2024-01-15'
      };

      const despesaTransaction = {
        account_id: 'acc-123',
        categoria_id: 'cat-456',
        tipo: 'despesa' as const,
        valor: 100,
        descricao: 'Teste',
        data: '2024-01-15'
      };

      expect(transactionSchema.safeParse(receitaTransaction).success).toBe(true);
      expect(transactionSchema.safeParse(despesaTransaction).success).toBe(true);
    });

    it('deve rejeitar tipo inválido', () => {
      const invalidTransaction = {
        account_id: 'acc-123',
        categoria_id: 'cat-456',
        tipo: 'transferencia' as any,
        valor: 100,
        descricao: 'Teste',
        data: '2024-01-15'
      };

      const result = transactionSchema.safeParse(invalidTransaction);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar tipo ausente', () => {
      const invalidTransaction = {
        account_id: 'acc-123',
        categoria_id: 'cat-456',
        valor: 100,
        descricao: 'Teste',
        data: '2024-01-15'
      };

      const result = transactionSchema.safeParse(invalidTransaction);
      expect(result.success).toBe(false);
    });
  });

  describe('validação de valor', () => {
    it('deve rejeitar valor negativo', () => {
      const invalidTransaction = {
        account_id: 'acc-123',
        categoria_id: 'cat-456',
        tipo: 'receita' as const,
        valor: -100,
        descricao: 'Teste',
        data: '2024-01-15'
      };

      const result = transactionSchema.safeParse(invalidTransaction);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Valor obrigatório');
      }
    });

    it('deve rejeitar valor zero', () => {
      const invalidTransaction = {
        account_id: 'acc-123',
        categoria_id: 'cat-456',
        tipo: 'receita' as const,
        valor: 0,
        descricao: 'Teste',
        data: '2024-01-15'
      };

      const result = transactionSchema.safeParse(invalidTransaction);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Valor obrigatório');
      }
    });

    it('deve aceitar valores decimais', () => {
      const validTransaction = {
        account_id: 'acc-123',
        categoria_id: 'cat-456',
        tipo: 'receita' as const,
        valor: 123.45,
        descricao: 'Teste',
        data: '2024-01-15'
      };

      const result = transactionSchema.safeParse(validTransaction);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar valor ausente', () => {
      const invalidTransaction = {
        account_id: 'acc-123',
        categoria_id: 'cat-456',
        tipo: 'receita' as const,
        descricao: 'Teste',
        data: '2024-01-15'
      };

      const result = transactionSchema.safeParse(invalidTransaction);
      expect(result.success).toBe(false);
    });
  });

  describe('validação de descrição', () => {
    it('deve aceitar descrição válida', () => {
      const validTransaction = {
        account_id: 'acc-123',
        categoria_id: 'cat-456',
        tipo: 'receita' as const,
        valor: 100,
        descricao: 'Descrição válida da transação',
        data: '2024-01-15'
      };

      const result = transactionSchema.safeParse(validTransaction);
      expect(result.success).toBe(true);
    });

    it('deve aceitar descrição vazia (opcional)', () => {
      const validTransaction = {
        account_id: 'acc-123',
        categoria_id: 'cat-456',
        tipo: 'receita' as const,
        valor: 100,
        descricao: '',
        data: '2024-01-15'
      };

      const result = transactionSchema.safeParse(validTransaction);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar descrição muito longa', () => {
      const longDescription = 'a'.repeat(256); // Limite de 255 caracteres
      const invalidTransaction = {
        account_id: 'acc-123',
        categoria_id: 'cat-456',
        tipo: 'receita' as const,
        valor: 100,
        descricao: longDescription,
        data: '2024-01-15'
      };

      const result = transactionSchema.safeParse(invalidTransaction);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Descrição demasiado longa');
      }
    });

    it('deve aceitar descrição no limite máximo', () => {
      const maxDescription = 'a'.repeat(255);
      const validTransaction = {
        account_id: 'acc-123',
        categoria_id: 'cat-456',
        tipo: 'receita' as const,
        valor: 100,
        descricao: maxDescription,
        data: '2024-01-15'
      };

      const result = transactionSchema.safeParse(validTransaction);
      expect(result.success).toBe(true);
    });

    it('deve aceitar descrição ausente (opcional)', () => {
      const validTransaction = {
        account_id: 'acc-123',
        categoria_id: 'cat-456',
        tipo: 'receita' as const,
        valor: 100,
        data: '2024-01-15'
      };

      const result = transactionSchema.safeParse(validTransaction);
      expect(result.success).toBe(true);
    });
  });

  describe('validação de data', () => {
    it('deve aceitar formato de data válido (YYYY-MM-DD)', () => {
      const validDates = ['2024-01-01', '2024-12-31', '2023-06-15'];
      
      validDates.forEach(date => {
        const validTransaction = {
          account_id: 'acc-123',
          categoria_id: 'cat-456',
          tipo: 'receita' as const,
          valor: 100,
          descricao: 'Teste',
          data: date
        };

        const result = transactionSchema.safeParse(validTransaction);
        expect(result.success).toBe(true);
      });
    });

    it('deve rejeitar formato de data inválido', () => {
      const invalidDates = ['2024/01/01', '01-01-2024', '2024-1-1', '24-01-01', 'hoje'];
      
      invalidDates.forEach(invalidDate => {
        const invalidTransaction = {
          account_id: 'acc-123',
          categoria_id: 'cat-456',
          tipo: 'receita' as const,
          valor: 100,
          descricao: 'Teste',
          data: invalidDate
        };

        const result = transactionSchema.safeParse(invalidTransaction);
        expect(result.success).toBe(false);
      });
    });

    it('deve rejeitar data ausente', () => {
      const invalidTransaction = {
        account_id: 'acc-123',
        categoria_id: 'cat-456',
        tipo: 'receita' as const,
        valor: 100,
        descricao: 'Teste'
      };

      const result = transactionSchema.safeParse(invalidTransaction);
      expect(result.success).toBe(false);
    });
  });

  describe('casos extremos', () => {
    it('deve rejeitar objeto vazio', () => {
      const result = transactionSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('deve rejeitar null', () => {
      const result = transactionSchema.safeParse(null);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar undefined', () => {
      const result = transactionSchema.safeParse(undefined);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar campos extras não definidos', () => {
      const transactionWithExtra = {
        account_id: 'acc-123',
        categoria_id: 'cat-456',
        tipo: 'receita' as const,
        valor: 100,
        descricao: 'Teste',
        data: '2024-01-15',
        campoExtra: 'não deveria estar aqui'
      };

      // O schema deve ignorar campos extras por padrão
      const result = transactionSchema.safeParse(transactionWithExtra);
      expect(result.success).toBe(true);
      if (result.success) {
        expect('campoExtra' in result.data).toBe(false);
      }
    });
  });

  describe('validação de tipos de dados', () => {
    it('deve converter string numérica para number no valor', () => {
      const transactionWithStringValue = {
        account_id: 'acc-123',
        categoria_id: 'cat-456',
        tipo: 'receita' as const,
        valor: '123.45' as any,
        descricao: 'Teste',
        data: '2024-01-15'
      };

      const result = transactionSchema.safeParse(transactionWithStringValue);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.valor).toBe('number');
        expect(result.data.valor).toBe(123.45);
      }
    });

    it('deve rejeitar valor não numérico', () => {
      const invalidTransaction = {
        account_id: 'acc-123',
        categoria_id: 'cat-456',
        tipo: 'receita' as const,
        valor: 'não é um número',
        descricao: 'Teste',
        data: '2024-01-15'
      };

      const result = transactionSchema.safeParse(invalidTransaction);
      expect(result.success).toBe(false);
    });
  });

  describe('validação de integridade', () => {
    it('deve validar transação completa com todos os campos obrigatórios', () => {
      const completeTransaction = {
        account_id: 'acc-123',
        categoria_id: 'cat-456',
        tipo: 'despesa' as const,
        valor: 75.99,
        descricao: 'Compra de material de escritório',
        data: '2024-01-15'
      };

      const result = transactionSchema.safeParse(completeTransaction);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.account_id).toBe('acc-123');
        expect(result.data.categoria_id).toBe('cat-456');
        expect(result.data.tipo).toBe('despesa');
        expect(result.data.valor).toBe(75.99);
        expect(result.data.descricao).toBe('Compra de material de escritório');
        expect(result.data.data).toBe('2024-01-15');
      }
    });
  });
});