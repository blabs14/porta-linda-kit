// Script para monitorizar tokens do Supabase em tempo real
// Cole este código na consola do browser para monitorizar

(function() {
    console.log('🔍 Iniciando monitorização de tokens Supabase...');
    
    // Estado inicial dos tokens
    let lastTokenState = {};
    
    function getSupabaseTokens() {
        const tokens = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('sb-')) {
                tokens[key] = localStorage.getItem(key);
            }
        }
        return tokens;
    }
    
    function analyzeToken(key, value) {
        try {
            const parsed = JSON.parse(value);
            const analysis = {
                key,
                hasAccessToken: !!parsed.access_token,
                hasRefreshToken: !!parsed.refresh_token,
                expiresAt: parsed.expires_at ? new Date(parsed.expires_at * 1000) : null,
                isValid: false,
                userId: parsed.user?.id || null
            };
            
            if (analysis.expiresAt) {
                analysis.isValid = analysis.expiresAt > new Date();
            }
            
            return analysis;
        } catch (e) {
            return {
                key,
                error: 'Invalid JSON',
                raw: value.substring(0, 100) + (value.length > 100 ? '...' : '')
            };
        }
    }
    
    function logTokenState(tokens, reason = '') {
        console.group(`🔑 Token State ${reason}`);
        console.log('Timestamp:', new Date().toISOString());
        console.log('Total tokens:', Object.keys(tokens).length);
        
        Object.entries(tokens).forEach(([key, value]) => {
            const analysis = analyzeToken(key, value);
            console.log(`📋 ${key}:`, analysis);
        });
        
        console.groupEnd();
    }
    
    function detectChanges(oldState, newState) {
        const changes = [];
        
        // Tokens removidos
        Object.keys(oldState).forEach(key => {
            if (!(key in newState)) {
                changes.push({ type: 'REMOVED', key, oldValue: oldState[key] });
            }
        });
        
        // Tokens adicionados
        Object.keys(newState).forEach(key => {
            if (!(key in oldState)) {
                changes.push({ type: 'ADDED', key, newValue: newState[key] });
            }
        });
        
        // Tokens modificados
        Object.keys(newState).forEach(key => {
            if (key in oldState && oldState[key] !== newState[key]) {
                changes.push({ 
                    type: 'MODIFIED', 
                    key, 
                    oldValue: oldState[key], 
                    newValue: newState[key] 
                });
            }
        });
        
        return changes;
    }
    
    // Estado inicial
    lastTokenState = getSupabaseTokens();
    logTokenState(lastTokenState, '(Initial State)');
    
    // Monitorizar mudanças a cada segundo
    const monitorInterval = setInterval(() => {
        const currentTokens = getSupabaseTokens();
        const changes = detectChanges(lastTokenState, currentTokens);
        
        if (changes.length > 0) {
            console.group('🚨 TOKEN CHANGES DETECTED!');
            console.log('Timestamp:', new Date().toISOString());
            
            changes.forEach(change => {
                switch (change.type) {
                    case 'REMOVED':
                        console.error('❌ Token REMOVED:', change.key);
                        console.log('Previous value:', analyzeToken(change.key, change.oldValue));
                        break;
                    case 'ADDED':
                        console.log('✅ Token ADDED:', change.key);
                        console.log('New value:', analyzeToken(change.key, change.newValue));
                        break;
                    case 'MODIFIED':
                        console.warn('🔄 Token MODIFIED:', change.key);
                        console.log('Old:', analyzeToken(change.key, change.oldValue));
                        console.log('New:', analyzeToken(change.key, change.newValue));
                        break;
                }
            });
            
            console.groupEnd();
            
            // Log do estado atual após mudanças
            logTokenState(currentTokens, '(After Changes)');
        }
        
        lastTokenState = currentTokens;
    }, 1000);
    
    // Interceptar eventos de storage
    const originalSetItem = localStorage.setItem;
    const originalRemoveItem = localStorage.removeItem;
    const originalClear = localStorage.clear;
    
    localStorage.setItem = function(key, value) {
        if (key.startsWith('sb-')) {
            console.log('📝 localStorage.setItem intercepted:', key);
            console.trace('Stack trace:');
        }
        return originalSetItem.apply(this, arguments);
    };
    
    localStorage.removeItem = function(key) {
        if (key.startsWith('sb-')) {
            console.warn('🗑️ localStorage.removeItem intercepted:', key);
            console.trace('Stack trace:');
        }
        return originalRemoveItem.apply(this, arguments);
    };
    
    localStorage.clear = function() {
        console.error('💥 localStorage.clear intercepted!');
        console.trace('Stack trace:');
        return originalClear.apply(this, arguments);
    };
    
    // Interceptar eventos de beforeunload
    window.addEventListener('beforeunload', function() {
        const finalTokens = getSupabaseTokens();
        console.group('🚪 BEFORE UNLOAD - Final Token State');
        logTokenState(finalTokens, '(Before Unload)');
        console.groupEnd();
        
        // Guardar no sessionStorage para análise após reload
        sessionStorage.setItem('tokenStateBeforeUnload', JSON.stringify({
            timestamp: new Date().toISOString(),
            tokens: finalTokens
        }));
    });
    
    // Verificar se há dados de antes do unload
    const beforeUnloadData = sessionStorage.getItem('tokenStateBeforeUnload');
    if (beforeUnloadData) {
        try {
            const data = JSON.parse(beforeUnloadData);
            console.group('🔄 AFTER RELOAD - Comparing with previous state');
            console.log('Previous state (before unload):', data);
            console.log('Current state (after reload):', { tokens: lastTokenState });
            
            const changes = detectChanges(data.tokens, lastTokenState);
            if (changes.length > 0) {
                console.error('🚨 TOKENS LOST DURING RELOAD!');
                changes.forEach(change => console.log(change));
            } else {
                console.log('✅ No token changes during reload');
            }
            console.groupEnd();
            
            // Limpar dados antigos
            sessionStorage.removeItem('tokenStateBeforeUnload');
        } catch (e) {
            console.error('Error parsing beforeUnloadData:', e);
        }
    }
    
    // Função para parar monitorização
    window.stopTokenMonitoring = function() {
        clearInterval(monitorInterval);
        
        // Restaurar funções originais
        localStorage.setItem = originalSetItem;
        localStorage.removeItem = originalRemoveItem;
        localStorage.clear = originalClear;
        
        console.log('🛑 Token monitoring stopped');
    };
    
    console.log('✅ Token monitoring started! Use stopTokenMonitoring() to stop.');
    console.log('🔍 Monitoring localStorage changes every second...');
    
})();

// Instruções de uso:
console.log(`
🔍 INSTRUÇÕES DE USO:

1. Cole este script na consola do browser
2. Faça login na aplicação
3. Faça refresh da página (F5 ou Ctrl+R)
4. Observe os logs para ver quando/como os tokens são perdidos
5. Use stopTokenMonitoring() para parar a monitorização

📋 O script irá:
- Monitorizar todos os tokens do Supabase (sb-*)
- Detectar quando tokens são adicionados/removidos/modificados
- Interceptar chamadas ao localStorage
- Comparar estado antes/depois do reload
- Mostrar stack traces de onde os tokens são manipulados
`);