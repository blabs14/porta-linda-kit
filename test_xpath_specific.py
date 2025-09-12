import asyncio
from playwright.async_api import async_playwright

async def test_xpath_specific():
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
        
        # Aguardar mais tempo para o React renderizar e o useEffect executar
        print("Aguardando React renderizar...")
        await page.wait_for_timeout(3000)
        
        print(f"URL atual: {page.url}")
        
        # Verificar se há elementos a diretamente no body
        direct_children = await page.evaluate('() => Array.from(document.body.children).map(el => el.tagName)')
        print(f"Filhos diretos do body: {direct_children}")
        
        # Verificar todos os elementos a no body
        all_links = await page.evaluate('''
            () => {
                const links = Array.from(document.body.querySelectorAll('a'));
                return links.map(link => ({
                    href: link.href,
                    text: link.textContent,
                    parent: link.parentElement.tagName,
                    isDirectChild: link.parentElement === document.body
                }));
            }
        ''')
        print(f"\nTodos os links encontrados: {len(all_links)}")
        for i, link in enumerate(all_links):
            print(f"  Link {i}: '{link['text']}' -> {link['href']} (parent: {link['parent']}, direct child: {link['isDirectChild']})")
        
        # Testar o xpath específico que o teste original usa
        try:
            xpath_locator = page.locator('xpath=html/body/a')
            count = await xpath_locator.count()
            print(f"\nElementos encontrados com 'xpath=html/body/a': {count}")
            
            if count > 0:
                for i in range(count):
                    element = xpath_locator.nth(i)
                    href = await element.get_attribute('href')
                    text = await element.inner_text()
                    print(f"Elemento {i}: '{text}' -> {href}")
            else:
                print("Nenhum elemento encontrado com o xpath específico")
                        
        except Exception as e:
            print(f"Erro ao testar xpath: {e}")
        
        await browser.close()

if __name__ == '__main__':
    asyncio.run(test_xpath_specific())