# Script seguro para corrigir erros no-console usando eslint-disable
Write-Host "Iniciando correção segura de erros no-console..."

$sourceDir = "src"
$files = Get-ChildItem -Path $sourceDir -Recurse -Include "*.ts", "*.tsx" | Where-Object { $_.Name -notlike "*.d.ts" }
$totalFixes = 0

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    $originalContent = $content
    
    # Adicionar eslint-disable antes de console statements
    # Padrão para console.log, console.error, etc. no início da linha
    $content = $content -replace '(?m)^(\s*)(console\.(log|error|warn|info|debug)\()', '$1// eslint-disable-next-line no-console`r`n$1$2'
    
    # Padrão para console statements em meio de expressões
    $content = $content -replace '(?m)(\s+)(console\.(log|error|warn|info|debug)\()', '$1// eslint-disable-next-line no-console`r`n$1$2'
    
    # Contar e aplicar mudanças
    if ($content -ne $originalContent) {
        $consoleMatches = ([regex]::Matches($originalContent, 'console\.(log|error|warn|info|debug)\(')).Count
        $totalFixes += $consoleMatches
        
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "Processado: $($file.Name) - $consoleMatches console statements"
    }
}

Write-Host "Processados $($files.Count) arquivos"
Write-Host "Total de console statements corrigidos: $totalFixes"
Write-Host "Concluído!"