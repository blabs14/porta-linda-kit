# 🔍 Guia de Debug - Problema de Logout no Refresh

## Ferramentas Implementadas

### 1. Logs Detalhados no AuthContext
✅ **Já implementado** - Os logs estão ativos nas funções `login` e `logout`

### 2. Script de Monitorização de Tokens
📁 **Ficheiro**: `monitor-tokens.js`

## Como Usar

### Passo 1: Abrir DevTools
1. Abra a aplicação no browser (http://localhost:3000)
2. Pressione F12 para abrir as DevTools
3. Vá para a aba **Console**

### Passo 2: Executar Script de Monitorização
1. Abra o ficheiro `monitor-tokens.js`
2. Copie todo o conteúdo
3. Cole na consola do browser e pressione Enter
4. Verá a mensagem: "✅ Token monitoring started!"

### Passo 3: Reproduzir o Problema
1. **Faça login** na aplicação
2. Observe os logs na consola (deve ver tokens a serem criados)
3. **Faça refresh** da página (F5 ou Ctrl+R)
4. Observe os logs para ver o que acontece aos tokens

## O Que Procurar nos Logs

### Logs do AuthContext
- `🔐 [AUTH] Login attempt started`
- `✅ [AUTH] Login successful`
- `🚪 [AUTH] Logout started`
- `✅ [AUTH] Logout completed`

### Logs do Monitor de Tokens
- `🔑 Token State` - Estado atual dos tokens
- `🚨 TOKEN CHANGES DETECTED!` - Quando tokens são alterados
- `❌ Token REMOVED` - Quando um token é removido
- `🔄 AFTER RELOAD` - Comparação antes/depois do refresh

### Sinais de Problema
1. **Tokens removidos durante refresh**: `❌ Token REMOVED`
2. **localStorage.clear intercepted**: Alguém está a limpar o storage
3. **Stack traces**: Mostram onde no código os tokens são manipulados
4. **Diferenças antes/depois reload**: Tokens perdidos durante o refresh

## Cenários Possíveis

### Cenário A: Tokens Removidos Explicitamente
- Verá `localStorage.removeItem intercepted` ou `localStorage.clear intercepted`
- Stack trace mostrará onde no código isto acontece

### Cenário B: Tokens Expiram Durante Refresh
- Verá tokens com `isValid: false`
- `expiresAt` será anterior ao timestamp atual

### Cenário C: Conflito entre onAuthStateChange e getSession
- Verá múltiplas chamadas de login/logout em sequência
- Tokens a serem criados e depois removidos rapidamente

### Cenário D: Problema de Configuração do Supabase
- Tokens não são criados de todo após login
- Ou são criados mas com formato inválido

## Próximos Passos

Depois de identificar o problema:

1. **Se tokens são removidos explicitamente**: Encontrar e corrigir o código que os remove
2. **Se tokens expiram**: Implementar refresh automático de tokens
3. **Se há conflitos**: Ajustar a lógica de autenticação
4. **Se é configuração**: Verificar configuração do Supabase

## Parar Monitorização

Quando terminar o debug:
```javascript
stopTokenMonitoring()
```

## Ficheiros Relevantes

- `src/contexts/AuthContext.tsx` - Contexto de autenticação (com logs)
- `src/lib/supabase.ts` - Configuração do Supabase
- `monitor-tokens.js` - Script de monitorização

---

**💡 Dica**: Execute o script de monitorização ANTES de fazer login para capturar todo o processo desde o início.