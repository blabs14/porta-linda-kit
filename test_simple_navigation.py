import asyncio
from playwright import async_api
import time

async def run_test():
    pw = None
    browser = None
    context = None
    
    try:
        print("Iniciando teste simples de navegação...")
        
        # Start Playwright
        pw = await async_api.async_playwright().start()
        
        # Launch browser with different settings
        browser = await pw.chromium.launch(
            headless=False,  # Changed to see what's happening
            slow_mo=1000,    # Slow down actions
            args=[
                "--disable-web-security",
                "--disable-features=VizDisplayCompositor",
                "--no-sandbox"
            ]
        )
        
        # Create context with longer timeouts
        context = await browser.new_context(
            viewport={'width': 1280, 'height': 720}
        )
        context.set_default_timeout(30000)  # 30 seconds
        
        # Open page
        page = await context.new_page()
        
        # Add console logging
        page.on("console", lambda msg: print(f"Console: {msg.text}"))
        page.on("pageerror", lambda error: print(f"Page error: {error}"))
        
        print("Navegando para http://localhost:8081")
        
        # Try navigation with retry
        for attempt in range(3):
            try:
                await page.goto("http://localhost:8081", wait_until="networkidle", timeout=30000)
                break
            except Exception as e:
                print(f"Tentativa {attempt + 1} falhou: {e}")
                if attempt == 2:
                    raise
                await asyncio.sleep(2)
        
        print(f"URL atual: {page.url}")
        
        # Wait for React to render
        print("Aguardando React renderizar...")
        await asyncio.sleep(5)
        
        # Check if page is still accessible
        try:
            title = await page.title()
            print(f"Título da página: {title}")
        except Exception as e:
            print(f"Erro ao obter título: {e}")
            return False
        
        # Get page content to debug
        content = await page.content()
        print(f"Tamanho do conteúdo: {len(content)} caracteres")
        
        # Try to find any link to register
        try:
            register_links = await page.locator('a[href*="register"]').count()
            print(f"Links para registo encontrados: {register_links}")
            
            if register_links > 0:
                # Get the first visible register link
                link = page.locator('a[href*="register"]').first
                href = await link.get_attribute('href')
                text = await link.text_content()
                print(f"Primeiro link: '{text}' -> {href}")
                
                # Click it
                print("A clicar no link...")
                await link.click()
                
                # Wait for navigation
                await page.wait_for_load_state("networkidle", timeout=15000)
                
                print(f"URL após clique: {page.url}")
                
                if '/register' in page.url:
                    print("✅ Sucesso! Navegação funcionou.")
                    return True
                else:
                    print("❌ Falha na navegação.")
                    return False
            else:
                print("❌ Nenhum link de registo encontrado.")
                # Let's see what links are available
                all_links = await page.locator('a').count()
                print(f"Total de links encontrados: {all_links}")
                
                if all_links > 0:
                    for i in range(min(all_links, 5)):  # Show first 5 links
                        link = page.locator('a').nth(i)
                        href = await link.get_attribute('href')
                        text = await link.text_content()
                        print(f"Link {i+1}: '{text}' -> {href}")
                
                return False
        except Exception as e:
            print(f"Erro ao procurar links: {e}")
            return False
        
    except Exception as e:
        print(f"Erro geral: {e}")
        return False
    
    finally:
        print("A fechar browser...")
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

if __name__ == "__main__":
    result = asyncio.run(run_test())
    if result:
        print("\n🎉 TESTE PASSOU!")
    else:
        print("\n❌ TESTE FALHOU!")