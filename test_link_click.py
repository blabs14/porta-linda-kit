import asyncio
from playwright import async_api

async def run_test():
    pw = None
    browser = None
    context = None
    
    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()
        
        # Launch a Chromium browser in headless mode
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",
                "--disable-dev-shm-usage",
                "--ipc=host",
                "--single-process"
            ],
        )
        
        # Create a new browser context
        context = await browser.new_context()
        context.set_default_timeout(10000)
        
        # Open a new page
        page = await context.new_page()
        
        print("Navegando para http://localhost:8081")
        # Navigate to the target URL
        await page.goto("http://localhost:8081", wait_until="networkidle", timeout=15000)
        
        print(f"URL atual: {page.url}")
        
        # Wait for the link to appear
        print("Aguardando o link aparecer...")
        elem = page.locator('xpath=html/body/a').nth(0)
        await elem.wait_for(state="attached", timeout=10000)
        
        # Check if element exists
        count = await elem.count()
        print(f"Elementos encontrados com xpath=html/body/a: {count}")
        
        if count > 0:
            # Get element details
            href = await elem.get_attribute('href')
            text = await elem.text_content()
            print(f"Link encontrado: '{text}' -> {href}")
            
            # Click the element
            print("A clicar no link...")
            await elem.click()
            
            # Wait for navigation to complete
            await page.wait_for_load_state("networkidle", timeout=10000)
            
            print(f"URL após clique: {page.url}")
            
            # Check if we're on the register page
            if '/register' in page.url:
                print("✅ Sucesso! Navegou para a página de registo.")
                return True
            else:
                print("❌ Falha! Não navegou para a página de registo.")
                return False
        else:
            print("❌ Nenhum elemento encontrado com o xpath especificado.")
            return False
        
    except Exception as e:
        print(f"Erro durante o teste: {e}")
        return False
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

if __name__ == "__main__":
    result = asyncio.run(run_test())
    if result:
        print("\n🎉 TESTE PASSOU! O link está a funcionar corretamente.")
    else:
        print("\n❌ TESTE FALHOU! O link não está a funcionar.")