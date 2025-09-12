import { describe, it, expect } from 'vitest';
import { budgetSchema } from '../budgetSchema';

describe('budgetSchema', () => {
  describe('validação básica', () => {
    it('deve validar um orçamento válido', () => {
      const validBudget = {
        categoria_id: 'cat-123',
        valor: 500.50,
        mes: '2024-01'
      };

      const result = budgetSchema.safeParse(validBudget);
      expect(result.success).toBe(true);
    });

    it('deve validar um orçamento com valor inteiro', () => {
      const validBudget = {
        categoria_id: 'cat-123',
        valor: 6000,
        mes: '2024-12'
      };

      const result = budgetSchema.safeParse(validBudget);
      expect(result.success).toBe(true);
    });
  });

  describe('validação de categoria_id', () => {
    it('deve rejeitar categoria_id vazio', () => {
      const invalidBudget = {
        categoria_id: '',
        valor: 500,
        mes: '2024-01'
      };

      const result = budgetSchema.safeParse(invalidBudget);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Categoria obrigatória');
      }
    });

    it('deve rejeitar categoria_id ausente', () => {
      const invalidBudget = {
        valor: 500,
        mes: '2024-01'
      };

      const result = budgetSchema.safeParse(invalidBudget);
      expect(result.success).toBe(false);
    });
  });

  describe('validação de valor', () => {
    it('deve rejeitar valor negativo', () => {
      const invalidBudget = {
        categoria_id: 'cat-123',
        valor: -100,
        mes: '2024-01'
      };

      const result = budgetSchema.safeParse(invalidBudget);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Valor obrigatório');
      }
    });

    it('deve rejeitar valor zero', () => {
      const invalidBudget = {
        categoria_id: 'cat-123',
        valor: 0,
        mes: '2024-01'
      };

      const result = budgetSchema.safeParse(invalidBudget);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Valor obrigatório');
      }
    });

    it('deve aceitar valores decimais', () => {
      const validBudget = {
        categoria_id: 'cat-123',
        valor: 123.45,
        mes: '2024-01'
      };

      const result = budgetSchema.safeParse(validBudget);
      expect(result.success).toBe(true);
    });
  });

  describe('validação de conversão de tipos', () => {
    it('deve converter string numérica para número', () => {
      const budgetWithStringValue = {
        categoria_id: 'cat-123',
        valor: '500.50',
        mes: '2024-01'
      };

      const result = budgetSchema.safeParse(budgetWithStringValue);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.valor).toBe('number');
        expect(result.data.valor).toBe(500.50);
      }
    });

    it('deve rejeitar valor não numérico', () => {
      const invalidBudget = {
        categoria_id: 'cat-123',
        valor: 'abc',
        mes: '2024-01'
      };

      const result = budgetSchema.safeParse(invalidBudget);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Valor inválido');
      }
    });

    it('deve aceitar valor como string numérica válida', () => {
      const validBudget = {
        categoria_id: 'cat-123',
        valor: '1000',
        mes: '2024-01'
      };

      const result = budgetSchema.safeParse(validBudget);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.valor).toBe(1000);
      }
    });
  });

  describe('validação de mês', () => {
    it('deve rejeitar mês ausente', () => {
      const invalidBudget = {
        categoria_id: 'cat-123',
        valor: 500
        // mes ausente
      };

      const result = budgetSchema.safeParse(invalidBudget);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar mês vazio', () => {
      const invalidBudget = {
        categoria_id: 'cat-123',
        valor: 500,
        mes: ''
      };

      const result = budgetSchema.safeParse(invalidBudget);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Mês inválido (YYYY-MM)');
      }
    });

    it('deve aceitar formato de mês válido (YYYY-MM)', () => {
      const validBudget = {
        categoria_id: 'cat-123',
        valor: 500,
        mes: '2024-12'
      };

      const result = budgetSchema.safeParse(validBudget);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar formato de mês inválido', () => {
      const invalidFormats = ['2024/01', '01-2024', '2024-1', '24-01', 'janeiro'];
      
      invalidFormats.forEach(invalidMes => {
        const invalidBudget = {
          categoria_id: 'cat-123',
          valor: 500,
          mes: invalidMes
        };

        const result = budgetSchema.safeParse(invalidBudget);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('casos extremos', () => {
    it('deve rejeitar objeto vazio', () => {
      const result = budgetSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('deve rejeitar null', () => {
      const result = budgetSchema.safeParse(null);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar undefined', () => {
      const result = budgetSchema.safeParse(undefined);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar campos extras não definidos', () => {
      const budgetWithExtra = {
        categoria_id: 'cat-123',
        valor: 500,
        mes: '2024-01',
        campoExtra: 'não deveria estar aqui'
      };

      // O schema deve ignorar campos extras por padrão
      const result = budgetSchema.safeParse(budgetWithExtra);
      expect(result.success).toBe(true);
      if (result.success) {
        expect('campoExtra' in result.data).toBe(false);
      }
    });
  });
});