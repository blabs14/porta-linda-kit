# Script melhorado para corrigir variáveis 'error' não utilizadas
# Substitui 'error' por '_error' em destructuring assignments

$sourceDir = "src"
$files = Get-ChildItem -Path $sourceDir -Recurse -Include "*.ts", "*.tsx" | Where-Object { !$_.PSIsContainer }

$totalFiles = 0
$totalReplacements = 0

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    $originalContent = $content
    
    # Padrão principal: qualquer destructuring com 'error'
    # Captura: const { ..., error } = ...
    # Captura: const { ..., error, ... } = ...
    # Captura: const { error } = ...
    $content = $content -replace '(const\s*{[^}]*?)\berror\b(?!:)([^}]*}\s*=)', '$1error: _error$2'
    
    # Para casos onde já existe _error, remover completamente a variável error não usada
    $content = $content -replace '(const\s*{[^}]*?),\s*error:\s*_error,\s*error\b([^}]*})', '$1, error: _error$2'
    $content = $content -replace '(const\s*{[^}]*?)\berror,\s*error:\s*_error\b([^}]*})', '$1error: _error$2'
    
    # Casos especiais para diferentes formatos
    $content = $content -replace '(const\s*{\s*)error(\s*}\s*=)', '$1error: _error$2'
    $content = $content -replace '(const\s*{[^}]*,\s*)error(\s*}\s*=)', '$1error: _error$2'
    $content = $content -replace '(const\s*{[^}]*,\s*)error(,\s*[^}]*}\s*=)', '$1error: _error$2'
    
    if ($content -ne $originalContent) {
        Write-Host "Processando: $($file.FullName)"
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $totalFiles++
        $totalReplacements++
    }
}

Write-Host "\nConcluído!"
Write-Host "Arquivos processados: $totalFiles"
Write-Host "Total de substituições: $totalReplacements"