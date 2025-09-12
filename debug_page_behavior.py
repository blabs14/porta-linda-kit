import asyncio
from playwright.async_api import async_playwright

async def debug_page_behavior():
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
        
        print(f"URL atual: {page.url}")
        print(f"Título: {await page.title()}")
        
        # Aguardar um pouco para ver se há redirecionamentos
        print("Aguardando 2 segundos...")
        await page.wait_for_timeout(2000)
        
        print(f"URL após 2s: {page.url}")
        
        # Verificar se existem links na página
        links = await page.locator('a').all()
        print(f"Número de links encontrados: {len(links)}")
        
        for i, link in enumerate(links):
            try:
                href = await link.get_attribute('href')
                text = await link.inner_text()
                print(f"Link {i+1}: '{text}' -> {href}")
            except Exception as e:
                print(f"Erro ao obter informações do link {i+1}: {e}")
        
        # Tentar encontrar o link específico que o teste procura
        try:
            target_link = page.locator('xpath=html/body/a').nth(0)
            if await target_link.count() > 0:
                href = await target_link.get_attribute('href')
                text = await target_link.inner_text()
                print(f"Link alvo encontrado: '{text}' -> {href}")
            else:
                print("Link alvo (xpath=html/body/a) não encontrado")
        except Exception as e:
            print(f"Erro ao procurar link alvo: {e}")
        
        # Aguardar mais tempo para ver se a página muda
        print("Aguardando mais 5 segundos...")
        await page.wait_for_timeout(5000)
        
        print(f"URL final: {page.url}")
        
        await browser.close()

if __name__ == '__main__':
    asyncio.run(debug_page_behavior())