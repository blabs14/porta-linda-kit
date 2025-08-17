import puppeteer from 'puppeteer';

async function testFamilyPage() {
  console.log('🔍 Iniciando teste da página de família...');
  
  const browser = await puppeteer.launch({ 
    headless: false, // Mostrar o navegador para debug
    slowMo: 1000 // Abrandar as ações para debug
  });
  
  try {
    const page = await browser.newPage();
    
    // Configurar logs do console
    page.on('console', msg => {
      console.log('📱 Browser Console:', msg.text());
    });
    
    page.on('pageerror', error => {
      console.error('❌ Browser Error:', error.message);
    });
    
    // Navegar para a aplicação
    console.log('🌐 Navegando para http://localhost:8084...');
    await page.goto('http://localhost:8084', { waitUntil: 'networkidle0' });
    
    // Aguardar um pouco para a aplicação carregar
    await page.waitForTimeout(3000);
    
    // Verificar se há algum erro na página
    const errors = await page.evaluate(() => {
      return window.console.errors || [];
    });
    
    if (errors.length > 0) {
      console.error('❌ Erros encontrados na página:', errors);
    }
    
    // Tentar navegar para a página de família
    console.log('👥 Navegando para a página de família...');
    await page.goto('http://localhost:8084/family', { waitUntil: 'networkidle0' });
    
    // Aguardar mais um pouco
    await page.waitForTimeout(3000);
    
    // Verificar se a página carregou corretamente
    const pageTitle = await page.title();
    console.log('📄 Título da página:', pageTitle);
    
    // Verificar se há algum texto específico da página de família
    const pageContent = await page.evaluate(() => {
      return document.body.innerText;
    });
    
    console.log('📝 Conteúdo da página (primeiros 500 caracteres):', pageContent.substring(0, 500));
    
    // Verificar se há algum erro de JavaScript
    const jsErrors = await page.evaluate(() => {
      return window.console.errors || [];
    });
    
    if (jsErrors.length > 0) {
      console.error('❌ Erros JavaScript:', jsErrors);
    }
    
    // Aguardar um pouco mais para ver os logs
    console.log('⏳ Aguardando 10 segundos para ver logs...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  } finally {
    await browser.close();
  }
}

// Executar o teste
testFamilyPage(); 