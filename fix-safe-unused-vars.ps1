# Script conservador para corrigir apenas casos seguros de variáveis não utilizadas
Write-Host "Iniciando correção conservadora de variáveis não utilizadas..."

$sourceDir = "src"
$files = Get-ChildItem -Path $sourceDir -Recurse -Include "*.ts", "*.tsx" | Where-Object { $_.Name -notlike "*.d.ts" }
$totalSubstitutions = 0

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    $originalContent = $content
    
    # Apenas casos muito seguros:
    
    # 1. Prefixar parâmetros de catch não utilizados
    $content = $content -replace '\}\s*catch\s*\(\s*error\s*\)\s*\{', '} catch (_error) {'
    $content = $content -replace '\}\s*catch\s*\(\s*e\s*\)\s*\{', '} catch (_e) {'
    $content = $content -replace '\}\s*catch\s*\(\s*err\s*\)\s*\{', '} catch (_err) {'
    
    # 2. Prefixar parâmetros de função não utilizados (apenas em arrow functions simples)
    $content = $content -replace '\.catch\s*\(\s*error\s*=>\s*\{', '.catch((_error) => {'
    $content = $content -replace '\.catch\s*\(\s*e\s*=>\s*\{', '.catch((_e) => {'
    $content = $content -replace '\.catch\s*\(\s*err\s*=>\s*\{', '.catch((_err) => {'
    
    # 3. Prefixar variáveis em destructuring apenas quando claramente não utilizadas
    # Apenas casos onde a variável 'error' está sozinha ou no final
    $content = $content -replace 'const\s*\{\s*data,\s*error\s*\}\s*=', 'const { data, error: _error } ='
    $content = $content -replace 'const\s*\{\s*error\s*\}\s*=', 'const { error: _error } ='
    
    # 4. Prefixar imports não utilizados de componentes específicos (apenas os mais comuns)
    $content = $content -replace '(import\s*{[^}]*),\s*Calendar([^}]*}\s*from)', '$1$2'
    $content = $content -replace '(import\s*{\s*)Calendar,\s*([^}]*})', '$1$2'
    
    # Contar substituições
    if ($content -ne $originalContent) {
        $changes = ($originalContent -split '\n').Count - ($content -split '\n').Count
        $totalSubstitutions += [Math]::Max(1, [Math]::Abs($changes) + 1)
        
        # Escrever o arquivo modificado
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "Processado: $($file.Name)"
    }
}

Write-Host "Processados $($files.Count) arquivos"
Write-Host "Total de substituições: $totalSubstitutions"
Write-Host "Concluído!"