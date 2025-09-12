import asyncio
from playwright.async_api import async_playwright

async def debug_html_structure():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--no-sandbox',
                '--disable-dev-shm-usage'
            ]
        )
        
        context = await browser.new_context(
            viewport={'width': 1280, 'height': 720},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        )
        
        page = await context.new_page()
        
        print("Navegando para http://localhost:8081")
        await page.goto('http://localhost:8081', wait_until='networkidle')
        
        # Aguardar um pouco para a página carregar completamente
        await page.wait_for_timeout(2000)
        
        print(f"URL atual: {page.url}")
        
        # Obter a estrutura HTML completa do body
        body_html = await page.locator('body').inner_html()
        print("\n=== ESTRUTURA HTML DO BODY ===")
        print(body_html)
        
        # Verificar se existem links diretos no body
        direct_links = await page.locator('body > a').all()
        print(f"\nLinks diretos no body: {len(direct_links)}")
        
        # Verificar todos os links na página
        all_links = await page.locator('a').all()
        print(f"Total de links na página: {len(all_links)}")
        
        for i, link in enumerate(all_links):
            try:
                href = await link.get_attribute('href')
                text = await link.inner_text()
                # Obter o xpath do link
                xpath = await page.evaluate('''
                    (element) => {
                        function getXPath(node) {
                            if (node.id !== '') {
                                return 'id("' + node.id + '")';
                            }
                            if (node === document.body) {
                                return 'html/body';
                            }
                            var ix = 0;
                            var siblings = node.parentNode.childNodes;
                            for (var i = 0; i < siblings.length; i++) {
                                var sibling = siblings[i];
                                if (sibling === node) {
                                    return getXPath(node.parentNode) + '/' + node.tagName.toLowerCase() + '[' + (ix + 1) + ']';
                                }
                                if (sibling.nodeType === 1 && sibling.tagName === node.tagName) {
                                    ix++;
                                }
                            }
                        }
                        return getXPath(element);
                    }
                ''', link)
                print(f"Link {i+1}: '{text}' -> {href} (XPath: {xpath})")
            except Exception as e:
                print(f"Erro ao obter informações do link {i+1}: {e}")
        
        await browser.close()

if __name__ == '__main__':
    asyncio.run(debug_html_structure())