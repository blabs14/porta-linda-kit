# Script para remover completamente variáveis não utilizadas
# Remove _error, _e, _err e outros componentes não utilizados

$sourceDir = "src"
$files = Get-ChildItem -Path $sourceDir -Recurse -Include "*.ts", "*.tsx" | Where-Object { !$_.PSIsContainer }

$totalFiles = 0
$totalReplacements = 0

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    $originalContent = $content
    
    # 1. Remover variáveis _error não utilizadas do destructuring
    $content = $content -replace '(const\s*{[^}]*),\s*error:\s*_error([^}]*})', '$1$2'
    $content = $content -replace '(const\s*{\s*)error:\s*_error,\s*([^}]*})', '$1$2'
    $content = $content -replace '(const\s*{\s*)error:\s*_error(\s*})', '$1$2'
    
    # 2. Remover catch handlers vazios com _error, _e, _err
    $content = $content -replace '\.catch\s*\(\s*_error\s*=>\s*{\s*}\s*\)', ''
    $content = $content -replace '\.catch\s*\(\s*_e\s*=>\s*{\s*}\s*\)', ''
    $content = $content -replace '\.catch\s*\(\s*_err\s*=>\s*{\s*}\s*\)', ''
    $content = $content -replace 'catch\s*\(\s*_error\s*\)\s*{\s*}', 'catch (_) {}'
    $content = $content -replace 'catch\s*\(\s*_e\s*\)\s*{\s*}', 'catch (_) {}'
    $content = $content -replace 'catch\s*\(\s*_err\s*\)\s*{\s*}', 'catch (_) {}'
    
    # 3. Remover imports não utilizados
    $unusedImports = @('Badge', 'useEffect', 'Plus', 'usePersonal', 'AlertCircle', 'DollarSign', 'TabsContent', 'Clock')
    
    foreach ($import in $unusedImports) {
        # Remover import no meio da lista
        $content = $content -replace "(import\s*{[^}]*),\s*$import([^}]*})", '$1$2'
        # Remover import no início da lista
        $content = $content -replace "(import\s*{\s*)$import,\s*([^}]*})", '$1$2'
        # Remover import sozinho
        $content = $content -replace "(import\s*{\s*)$import(\s*})", '$1$2'
    }
    
    # 4. Remover parâmetros não utilizados em funções (index, data)
    $content = $content -replace '(\([^)]*),\s*index\s*(\)\s*=>)', '$1$2'
    $content = $content -replace '(\([^)]*),\s*data\s*(\)\s*=>)', '$1$2'
    $content = $content -replace '(\(\s*)index\s*(\)\s*=>)', '($1_$2'
    $content = $content -replace '(\(\s*)data\s*(\)\s*=>)', '($1_$2'
    
    # 5. Limpar imports vazios
    $content = $content -replace 'import\s*{\s*}\s*from\s*[^;]+;\s*\n', ''
    $content = $content -replace 'import\s*{\s*,\s*([^}]+)}', 'import { $1 }'
    $content = $content -replace 'import\s*{([^}]*),\s*}', 'import {$1 }'
    
    # 6. Limpar destructuring vazio
    $content = $content -replace 'const\s*{\s*}\s*=\s*[^;]+;\s*\n', ''
    $content = $content -replace 'const\s*{\s*,\s*([^}]+)}', 'const { $1 }'
    $content = $content -replace 'const\s*{([^}]*),\s*}', 'const {$1 }'
    
    if ($content -ne $originalContent) {
        Write-Host "Processando: $($file.FullName)"
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $totalFiles++
        $totalReplacements++
    }
}

Write-Host "\nConcluído!"
Write-Host "Arquivos processados: $totalFiles"
Write-Host "Total de remoções: $totalReplacements"