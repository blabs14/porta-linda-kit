# Script para corrigir erros de parsing causados por console statements mal comentados
Write-Host "Iniciando correção de erros de parsing..."

$sourceDir = "src"
$files = Get-ChildItem -Path $sourceDir -Recurse -Include "*.ts", "*.tsx" | Where-Object { $_.Name -notlike "*.d.ts" }
$totalFixes = 0

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    $originalContent = $content
    
    # Padrão 1: Corrigir console statements multi-linha mal comentados
    # Procurar por linhas que começam com // console.( seguidas de linhas soltas
    $content = $content -replace '(?m)^(\s*)// console\.(\w+)\(([^\)]*\r?\n(?:\s*[^\s//][^\r\n]*\r?\n)*\s*[^\s//][^\)]*\));?', '$1// console.$2($3);'
    
    # Padrão 2: Comentar linhas soltas que parecem ser parte de console statements
    # Linhas que começam com parâmetros ou propriedades após um console comentado
    $lines = $content -split "\r?\n"
    $newLines = @()
    $inConsoleBlock = $false
    
    for ($i = 0; $i -lt $lines.Length; $i++) {
        $line = $lines[$i]
        
        # Detectar início de bloco console comentado
        if ($line -match '^\s*// console\.(\w+)\(') {
            $inConsoleBlock = $true
            $newLines += $line
            continue
        }
        
        # Se estamos em um bloco console e a linha não está comentada
        if ($inConsoleBlock) {
            # Se a linha contém }) ou }); marca o fim do bloco
            if ($line -match '^\s*\}\);?\s*$') {
                $newLines += $line -replace '^(\s*)', '$1// '
                $inConsoleBlock = $false
                continue
            }
            # Se a linha parece ser parte do console (indentada e não comentada)
            elseif ($line -match '^\s+[^\s//]' -and $line -notmatch '^\s*(try|catch|if|for|while|function|const|let|var|return)') {
                $newLines += $line -replace '^(\s*)', '$1// '
                continue
            }
            # Se chegamos a uma linha que não faz parte do console, sair do bloco
            else {
                $inConsoleBlock = $false
            }
        }
        
        $newLines += $line
    }
    
    $content = $newLines -join "`r`n"
    
    # Padrão 3: Corrigir blocos try/catch mal formados
    $content = $content -replace '(?m)^(\s*)catch\s*\(\s*\)\s*\{\s*$', '$1catch (_error) {'
    
    # Padrão 4: Remover linhas órfãs que começam com propriedades
    $content = $content -replace '(?m)^\s+(goalId|accountId|amount|description|[a-zA-Z]+:)(?!.*//)', '// $&'
    
    # Contar e aplicar mudanças
    if ($content -ne $originalContent) {
        $totalFixes++
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "Corrigido: $($file.Name)"
    }
}

Write-Host "Processados $($files.Count) arquivos"
Write-Host "Total de arquivos corrigidos: $totalFixes"
Write-Host "Concluído!"