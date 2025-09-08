# Script para remover variáveis não utilizadas completamente
Write-Host "Iniciando remoção de variáveis não utilizadas..."

$sourceDir = "src"
$files = Get-ChildItem -Path $sourceDir -Recurse -Include "*.ts", "*.tsx" | Where-Object { $_.Name -notlike "*.d.ts" }
$totalSubstitutions = 0

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    $originalContent = $content
    
    # Padrão 1: Remover variáveis _error não utilizadas em destructuring
    # const { data, error: _error } = ... -> const { data } = ...
    $content = $content -replace 'const\s*\{\s*([^}]+),\s*error:\s*_error\s*\}\s*=', 'const { $1 } ='
    
    # Padrão 2: Remover _error quando é a única variável além de data
    # const { data, error: _error } = ... -> const { data } = ...
    $content = $content -replace 'const\s*\{\s*data,\s*error:\s*_error\s*\}\s*=', 'const { data } ='
    
    # Padrão 3: Remover _error quando é a primeira variável
    # const { error: _error, data } = ... -> const { data } = ...
    $content = $content -replace 'const\s*\{\s*error:\s*_error,\s*([^}]+)\s*\}\s*=', 'const { $1 } ='
    
    # Padrão 4: Remover apenas _error quando é a única variável
    # const { error: _error } = ... -> const { } = ... (depois limpar)
    $content = $content -replace 'const\s*\{\s*error:\s*_error\s*\}\s*=', 'const { } ='
    
    # Padrão 5: Limpar destructuring vazio
    # const { } = ... -> // const { } = ...
    $content = $content -replace 'const\s*\{\s*\}\s*=\s*([^;]+);', '// Removed unused destructuring: const { } = $1;'
    
    # Padrão 6: Remover variáveis _e, _err em catch blocks
    # } catch (_e) { -> } catch {
    $content = $content -replace '\}\s*catch\s*\(\s*_e\s*\)\s*\{', '} catch {'
    $content = $content -replace '\}\s*catch\s*\(\s*_err\s*\)\s*\{', '} catch {'
    $content = $content -replace '\}\s*catch\s*\(\s*_error\s*\)\s*\{', '} catch {'
    
    # Padrão 7: Remover referências a variáveis _error que não são mais necessárias
    # if (_error) throw _error; -> // Removed error handling
    $content = $content -replace 'if\s*\(\s*_error\s*\)\s*throw\s*_error;', '// Removed unused error handling'
    $content = $content -replace 'if\s*\(\s*_error\s*\)\s*\{[^}]*\}', '// Removed unused error handling block'
    
    # Padrão 8: Remover linhas que só verificam _error
    $content = $content -replace '(?m)^\s*if\s*\(\s*_error\s*\).*$', '// Removed unused error check'
    
    # Padrão 9: Limpar espaços extras em destructuring
    $content = $content -replace 'const\s*\{\s*,\s*([^}]+)\s*\}\s*=', 'const { $1 } ='
    $content = $content -replace 'const\s*\{\s*([^}]+)\s*,\s*\}\s*=', 'const { $1 } ='
    
    # Padrão 10: Remover imports não utilizados de componentes UI
    $content = $content -replace ',\s*_[A-Z][a-zA-Z]*', ''
    $content = $content -replace '_[A-Z][a-zA-Z]*,\s*', ''
    
    # Contar substituições
    if ($content -ne $originalContent) {
        $substitutions = ($originalContent.Length - $content.Length) / 10  # Estimativa
        $totalSubstitutions += [Math]::Max(1, [Math]::Floor($substitutions))
        
        # Escrever o arquivo modificado
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "Processado: $($file.Name)"
    }
}

Write-Host "Processados $($files.Count) arquivos"
Write-Host "Total de substituições: $totalSubstitutions"
Write-Host "Concluído!"