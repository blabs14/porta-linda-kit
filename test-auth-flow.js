// Teste simples para verificar o fluxo de autenticação
// Execute com: node test-auth-flow.js

const puppeteer = require('puppeteer');

async function testAuthFlow() {
  console.log('🧪 Iniciando teste do fluxo de autenticação...');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  try {
    const page = await browser.newPage();
    
    // Interceptar logs do console
    page.on('console', msg => {
      if (msg.text().includes('🔐') || msg.text().includes('AuthContext')) {
        console.log('📱 Console:', msg.text());
      }
    });
    
    // Interceptar erros
    page.on('pageerror', error => {
      console.error('❌ Erro na página:', error.message);
    });
    
    console.log('1. Navegando para a aplicação...');
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    
    console.log('2. Verificando redirecionamento para login...');
    const currentUrl = page.url();
    console.log('   URL atual:', currentUrl);
    
    if (currentUrl.includes('/login')) {
      console.log('✅ Redirecionamento para login funcionou');
    } else {
      console.log('⚠️  Não foi redirecionado para login');
    }
    
    console.log('3. Tentando aceder a rota protegida diretamente...');
    await page.goto('http://localhost:5173/app');
    await page.waitForTimeout(2000);
    
    const protectedUrl = page.url();
    console.log('   URL após tentar aceder /app:', protectedUrl);
    
    if (protectedUrl.includes('/login')) {
      console.log('✅ Proteção de rotas funcionou - redirecionado para login');
    } else {
      console.log('❌ Proteção de rotas falhou - não foi redirecionado');
    }
    
    console.log('4. Verificando se o formulário de login está presente...');
    const emailInput = await page.$('input[type="email"]');
    const passwordInput = await page.$('input[type="password"]');
    const loginButton = await page.$('button[type="submit"]');
    
    if (emailInput && passwordInput && loginButton) {
      console.log('✅ Formulário de login encontrado');
    } else {
      console.log('❌ Formulário de login não encontrado');
    }
    
    console.log('\n🎯 Teste concluído. Verifique os logs acima para identificar problemas.');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  } finally {
    await browser.close();
  }
}

// Verificar se o Puppeteer está disponível
try {
  testAuthFlow();
} catch (error) {
  console.log('⚠️  Puppeteer não está disponível. Execute: npm install puppeteer');
  console.log('   Ou teste manualmente navegando para http://localhost:5173');
}