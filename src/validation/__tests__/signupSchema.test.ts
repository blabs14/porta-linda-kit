import { describe, it, expect } from 'vitest';
import { signupSchema } from '../../models/authSchema';

describe('signupSchema', () => {
  describe('validação básica', () => {
    it('deve validar um signup válido', () => {
      const validSignup = {
        nome: 'João Silva',
        email: 'joao.silva@exemplo.com',
        password: 'MinhaSenh@123'
      };

      const result = signupSchema.safeParse(validSignup);
      expect(result.success).toBe(true);
    });
  });

  describe('validação de nome', () => {
    it('deve aceitar nome válido', () => {
      const validNames = [
        'João Silva',
        'Maria da Silva Santos',
        'Ana',
        'José Carlos de Oliveira Neto'
      ];

      validNames.forEach(nome => {
        const signup = {
          nome,
          email: 'teste@exemplo.com',
          password: 'MinhaSenh@123'
        };

        const result = signupSchema.safeParse(signup);
        expect(result.success).toBe(true);
      });
    });

    it('deve rejeitar nome vazio', () => {
      const invalidSignup = {
        nome: '',
        email: 'teste@exemplo.com',
        password: 'MinhaSenh@123'
      };

      const result = signupSchema.safeParse(invalidSignup);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Nome é obrigatório');
      }
    });

    it('deve rejeitar nome muito curto', () => {
      const invalidSignup = {
        nome: 'A',
        email: 'teste@exemplo.com',
        password: 'MinhaSenh@123'
      };

      const result = signupSchema.safeParse(invalidSignup);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('pelo menos 2 caracteres');
      }
    });

    it('deve rejeitar nome muito longo', () => {
      const longName = 'a'.repeat(101); // Assumindo limite de 100 caracteres
      const invalidSignup = {
        nome: longName,
        email: 'teste@exemplo.com',
        password: 'MinhaSenh@123'
      };

      const result = signupSchema.safeParse(invalidSignup);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Nome demasiado longo');
      }
    });

    it('deve aceitar nome no limite máximo', () => {
      const maxName = 'a'.repeat(100);
      const validSignup = {
        nome: maxName,
        email: 'teste@exemplo.com',
        password: 'MinhaSenh@123'
      };

      const result = signupSchema.safeParse(validSignup);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar nome ausente', () => {
      const invalidSignup = {
        email: 'teste@exemplo.com',
        password: 'MinhaSenh@123'
      };

      const result = signupSchema.safeParse(invalidSignup);
      expect(result.success).toBe(false);
    });

    it('deve remover espaços extras do nome', () => {
      const signupWithSpaces = {
        nome: '  João Silva  ',
        email: 'teste@exemplo.com',
        password: 'MinhaSenh@123'
      };

      const result = signupSchema.safeParse(signupWithSpaces);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nome).toBe('João Silva');
      }
    });
  });

  describe('validação de email', () => {
    it('deve aceitar emails válidos', () => {
      const validEmails = [
        'usuario@exemplo.com',
        'teste.email@dominio.com.br',
        'user+tag@exemplo.org',
        'nome.sobrenome@empresa.co.uk',
        'admin@localhost.dev'
      ];

      validEmails.forEach(email => {
        const signup = {
          nome: 'João Silva',
          email,
          password: 'MinhaSenh@123'
        };

        const result = signupSchema.safeParse(signup);
        expect(result.success).toBe(true);
      });
    });

    it('deve rejeitar emails inválidos', () => {
      const invalidEmails = [
        'email-sem-arroba.com',
        '@dominio.com',
        'usuario@',
        'usuario@dominio',
        'usuario..duplo@dominio.com',
        'usuario@dominio..com',
        'usuário com espaço@dominio.com',
        ''
      ];

      invalidEmails.forEach(email => {
        const signup = {
          nome: 'João Silva',
          email,
          password: 'MinhaSenh@123'
        };

        const result = signupSchema.safeParse(signup);
        expect(result.success).toBe(false);
      });
    });

    it('deve rejeitar email vazio', () => {
      const invalidSignup = {
        nome: 'João Silva',
        email: '',
        password: 'MinhaSenh@123'
      };

      const result = signupSchema.safeParse(invalidSignup);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Email é obrigatório');
      }
    });

    it('deve rejeitar email ausente', () => {
      const invalidSignup = {
        nome: 'João Silva',
        password: 'MinhaSenh@123'
      };

      const result = signupSchema.safeParse(invalidSignup);
      expect(result.success).toBe(false);
    });

    it('deve aceitar email em maiúsculas', () => {
      const signupWithUppercaseEmail = {
        nome: 'João Silva',
        email: 'USUARIO@EXEMPLO.COM',
        password: 'MinhaSenh@123'
      };

      const result = signupSchema.safeParse(signupWithUppercaseEmail);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('USUARIO@EXEMPLO.COM');
      }
    });

    it('deve rejeitar email com espaços', () => {
      const signupWithSpaces = {
        nome: 'João Silva',
        email: '  usuario@exemplo.com  ',
        password: 'MinhaSenh@123'
      };

      const result = signupSchema.safeParse(signupWithSpaces);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Formato de email inválido');
      }
    });
  });

  describe('validação de senha', () => {
    it('deve aceitar senhas válidas', () => {
      const validPasswords = [
        'MinhaSenh@123',
        'Senha!Forte456',
        'P@ssw0rd2024',
        'MinhaSenha#789',
        'Teste@123456'
      ];

      validPasswords.forEach(password => {
        const signup = {
          nome: 'João Silva',
          email: 'teste@exemplo.com',
          password
        };

        const result = signupSchema.safeParse(signup);
        expect(result.success).toBe(true);
      });
    });

    it('deve rejeitar senha muito curta', () => {
      const shortPasswords = [
        '123',
        'Ab1',
        'Abc'
      ];

      shortPasswords.forEach(password => {
        const signup = {
          nome: 'João Silva',
          email: 'teste@exemplo.com',
          password
        };

        const result = signupSchema.safeParse(signup);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('pelo menos 6 caracteres');
        }
      });
    });

    it('deve rejeitar senha sem letra', () => {
      const invalidPasswords = [
        '123456',
        '@#$%^&',
        '!@#$%^'
      ];

      invalidPasswords.forEach(password => {
        const signup = {
          nome: 'João Silva',
          email: 'teste@exemplo.com',
          password
        };

        const result = signupSchema.safeParse(signup);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('pelo menos uma letra');
        }
      });
    });

    it('deve aceitar senha com letras maiúsculas', () => {
      const validPasswords = [
        'MINHASENHA',
        'SENHAFORTE',
        'PASSWORD'
      ];

      validPasswords.forEach(password => {
        const signup = {
          nome: 'João Silva',
          email: 'teste@exemplo.com',
          password
        };

        const result = signupSchema.safeParse(signup);
        expect(result.success).toBe(true);
      });
    });

    it('deve aceitar senha com letras minúsculas', () => {
      const validPasswords = [
        'minhasenha',
        'senhaforte',
        'password'
      ];

      validPasswords.forEach(password => {
        const signup = {
          nome: 'João Silva',
          email: 'teste@exemplo.com',
          password
        };

        const result = signupSchema.safeParse(signup);
        expect(result.success).toBe(true);
      });
    });

    it('deve aceitar senha com números e letras', () => {
      const validPasswords = [
        'MinhaSenha123',
        'SenhaForte456',
        'Password2024'
      ];

      validPasswords.forEach(password => {
        const signup = {
          nome: 'João Silva',
          email: 'teste@exemplo.com',
          password
        };

        const result = signupSchema.safeParse(signup);
        expect(result.success).toBe(true);
      });
    });

    it('deve rejeitar senha vazia', () => {
      const invalidSignup = {
        nome: 'João Silva',
        email: 'teste@exemplo.com',
        password: ''
      };

      const result = signupSchema.safeParse(invalidSignup);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Password é obrigatória');
      }
    });

    it('deve rejeitar senha ausente', () => {
      const invalidSignup = {
        nome: 'João Silva',
        email: 'teste@exemplo.com'
      };

      const result = signupSchema.safeParse(invalidSignup);
      expect(result.success).toBe(false);
    });

    it('deve aceitar senha no limite mínimo', () => {
      const minValidPassword = 'Abc@1234'; // 8 caracteres
      const validSignup = {
        nome: 'João Silva',
        email: 'teste@exemplo.com',
        password: minValidPassword
      };

      const result = signupSchema.safeParse(validSignup);
      expect(result.success).toBe(true);
    });
  });

  describe('casos extremos', () => {
    it('deve rejeitar objeto vazio', () => {
      const result = signupSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('deve rejeitar null', () => {
      const result = signupSchema.safeParse(null);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar undefined', () => {
      const result = signupSchema.safeParse(undefined);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar campos extras não definidos', () => {
      const signupWithExtra = {
        nome: 'João Silva',
        email: 'teste@exemplo.com',
        password: 'MinhaSenh@123',
        campoExtra: 'não deveria estar aqui'
      };

      // O schema deve ignorar campos extras por padrão
      const result = signupSchema.safeParse(signupWithExtra);
      expect(result.success).toBe(true);
      if (result.success) {
        expect('campoExtra' in result.data).toBe(false);
      }
    });
  });

  describe('validação de tipos de dados', () => {
    it('deve rejeitar tipos incorretos', () => {
      const invalidTypes = [
        {
          nome: 123,
          email: 'teste@exemplo.com',
          password: 'MinhaSenh@123'
        },
        {
          nome: 'João Silva',
          email: 123,
          password: 'MinhaSenh@123'
        },
        {
          nome: 'João Silva',
          email: 'teste@exemplo.com',
          password: 123
        }
      ];

      invalidTypes.forEach(invalidData => {
        const result = signupSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('validação de integridade', () => {
    it('deve validar signup completo com todos os campos obrigatórios', () => {
      const completeSignup = {
        nome: 'Maria da Silva Santos',
        email: 'maria.santos@exemplo.com.br',
        password: 'MinhaSenha@2024'
      };

      const result = signupSchema.safeParse(completeSignup);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.nome).toBe('Maria da Silva Santos');
        expect(result.data.email).toBe('maria.santos@exemplo.com.br');
        expect(result.data.password).toBe('MinhaSenha@2024');
      }
    });

    it('deve aplicar transformações corretas', () => {
      const signupWithTransformations = {
        nome: '  João Silva  ',
        email: 'joao.silva@exemplo.com',
        password: 'MinhaSenh@123'
      };

      const result = signupSchema.safeParse(signupWithTransformations);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.nome).toBe('João Silva'); // trim aplicado
        expect(result.data.email).toBe('joao.silva@exemplo.com'); // sem transformação
        expect(result.data.password).toBe('MinhaSenh@123'); // sem transformação
      }
    });
  });

  describe('validação de caracteres especiais em senha', () => {
    it('deve aceitar diferentes tipos de caracteres especiais', () => {
      const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '-', '_', '+', '=', '[', ']', '{', '}', '|', '\\', ':', ';', '"', "'", '<', '>', ',', '.', '?', '/', '~', '`'];
      
      specialChars.forEach(char => {
        const password = `MinhaSenh${char}123`;
        const signup = {
          nome: 'João Silva',
          email: 'teste@exemplo.com',
          password
        };

        const result = signupSchema.safeParse(signup);
        expect(result.success).toBe(true);
      });
    });
  });
});