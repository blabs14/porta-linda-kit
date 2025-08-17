# Testes Obsoletos

Este diretório contém arquivos de teste que foram movidos da raiz do projeto por serem:
- Duplicados
- Obsoletos
- Scripts de debug temporários
- Testes manuais que não seguem a estrutura organizada

## Arquivos Movidos

### Testes de Família (Duplicados/Debug)
- `test_family_browser.js` - Teste com Puppeteer (debug)
- `test_family_rpc.js` - Teste de RPC básico
- `test_family_rpc_fixed.js` - Versão corrigida do teste RPC
- `test_family_simple.js` - Teste simples de família

### Testes de Objetivos (Debug)
- `test_goals_debug.js` - Script de debug para criação de objetivos
- `test_goals_forms.js` - Teste de formulários de objetivos
- `test_form_debug.js` - Debug geral de formulários

### Testes de Conexão
- `test_supabase_connection.cjs` - Teste de conexão com Supabase

## Nota

Estes arquivos foram preservados caso seja necessário consultar a lógica implementada, mas não devem ser utilizados na estrutura de testes atual. Os testes relevantes foram migrados para a estrutura organizada em:

- `tests/unit/` - Testes unitários
- `tests/integration/` - Testes de integração
- `tests/e2e/` - Testes end-to-end
- `tests/manual/` - Testes manuais organizados