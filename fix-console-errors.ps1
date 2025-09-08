# Script para corrigir erros de no-console
Write-Host "Iniciando correção de erros no-console..."

$sourceDir = "src"
$files = Get-ChildItem -Path $sourceDir -Recurse -Include "*.ts", "*.tsx" | Where-Object { $_.Name -notlike "*.d.ts" }
$totalSubstitutions = 0

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    $originalContent = $content
    
    # Comentar console.log, console.error, console.warn, console.info
    $content = $content -replace '^(\s*)console\.(log|error|warn|info)\(', '$1// console.$2('
    $content = $content -replace '^(\s*)console\.(log|error|warn|info)\(([^;]+);', '$1// console.$2($3;'
    
    # Para console statements em meio de linha
    $content = $content -replace '(\s+)console\.(log|error|warn|info)\(', '$1// console.$2('
    
    # Para console.debug também
    $content = $content -replace '^(\s*)console\.debug\(', '$1// console.debug('
    $content = $content -replace '(\s+)console\.debug\(', '$1// console.debug('
    
    # Contar substituições
    if ($content -ne $originalContent) {
        $consoleMatches = ([regex]::Matches($originalContent, 'console\.(log|error|warn|info|debug)\(')).Count
        $totalSubstitutions += $consoleMatches
        
        # Escrever o arquivo modificado
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "Processado: $($file.Name) - $consoleMatches console statements comentados"
    }
}

Write-Host "Processados $($files.Count) arquivos"
Write-Host "Total de console statements comentados: $totalSubstitutions"
Write-Host "Concluído!"