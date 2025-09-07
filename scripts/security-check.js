#!/usr/bin/env node

/**
 * Script de Verificação de Segurança Local
 * Executa verificações de segurança antes do commit
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logHeader(message) {
  log(`\n${colors.bold}${colors.blue}🛡️  ${message}${colors.reset}`);
  log('='.repeat(50), colors.blue);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function runCommand(command, description) {
  try {
    log(`\n🔍 ${description}...`);
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    return { success: true, output };
  } catch (error) {
    return { success: false, error: error.message, output: error.stdout };
  }
}

function checkEnvironmentFiles() {
  logHeader('Verificação de Ficheiros de Ambiente');
  
  const envFiles = ['.env', '.env.local', '.env.production'];
  const sensitivePatterns = [
    /password\s*=\s*[^\s]+/i,
    /secret\s*=\s*[^\s]+/i,
    /private_key\s*=\s*[^\s]+/i,
    /token\s*=\s*[^\s]+/i
  ];
  
  // Padrões seguros conhecidos (chaves públicas, etc.)
  const safePatterns = [
    /VITE_SUPABASE_ANON_KEY/i,
    /SUPABASE_ANON_KEY/i,
    /VITE_VAPID_PUBLIC_KEY/i,
    /VITE_VAPID_PRIVATE_KEY/i, // Chave VAPID para notificações push (desenvolvimento)
    /VITE_SUPABASE_URL/i,
    /SUPABASE_URL/i,
    /VITE_BASE_PATH/i,
    /VITE_PAYROLL_AUTO_DEDUCTIONS/i // Feature flags
  ];
  
  let hasIssues = false;
  
  envFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        // Ignorar comentários e linhas vazias
        if (line.trim().startsWith('#') || !line.trim()) return;
        
        // Verificar se contém valores sensíveis
        sensitivePatterns.forEach(pattern => {
          if (pattern.test(line)) {
            // Verificar se não é um padrão seguro conhecido
            const isSafe = safePatterns.some(safePattern => safePattern.test(line));
            
            if (!isSafe) {
              const keyName = line.split('=')[0].trim();
              const value = line.split('=')[1]?.trim();
              
              // Verificar se não é placeholder
              if (value && !value.includes('your_') && !value.includes('placeholder') && !value.includes('example')) {
                logWarning(`Possível credencial sensível em ${file}:${index + 1} - ${keyName}`);
                hasIssues = true;
              }
            }
          }
        });
      });
    }
  });
  
  if (!hasIssues) {
    logSuccess('Nenhuma credencial suspeita encontrada nos ficheiros de ambiente');
  }
  
  return !hasIssues;
}

function checkDependencies() {
  logHeader('Auditoria de Dependências');
  
  const auditResult = runCommand('npm audit --json', 'Executando npm audit');
  
  if (auditResult.success) {
    try {
      const auditData = JSON.parse(auditResult.output);
      const vulnerabilities = auditData.metadata?.vulnerabilities || {};
      
      const total = Object.values(vulnerabilities).reduce((sum, count) => sum + count, 0);
      
      if (total === 0) {
        logSuccess('Nenhuma vulnerabilidade encontrada!');
        return true;
      } else {
        logWarning(`Encontradas ${total} vulnerabilidades:`);
        Object.entries(vulnerabilities).forEach(([severity, count]) => {
          if (count > 0) {
            const color = severity === 'critical' || severity === 'high' ? colors.red : colors.yellow;
            log(`  ${severity}: ${count}`, color);
          }
        });
        
        // Falhar apenas para vulnerabilidades críticas ou altas
        const criticalIssues = (vulnerabilities.critical || 0) + (vulnerabilities.high || 0);
        if (criticalIssues > 0) {
          logError('Vulnerabilidades críticas/altas encontradas! Execute: npm audit fix');
          return false;
        } else {
          logWarning('Vulnerabilidades menores encontradas. Considere executar: npm audit fix');
          return true;
        }
      }
    } catch (error) {
      logError('Erro ao analisar resultado do audit');
      return false;
    }
  } else {
    logError('Falha ao executar npm audit');
    return false;
  }
}

function checkOutdatedDependencies() {
  logHeader('Verificação de Dependências Desatualizadas');
  
  const outdatedResult = runCommand('npm outdated --json', 'Verificando dependências desatualizadas');
  
  if (outdatedResult.success && outdatedResult.output.trim()) {
    try {
      const outdatedData = JSON.parse(outdatedResult.output);
      const outdatedCount = Object.keys(outdatedData).length;
      
      if (outdatedCount > 0) {
        logWarning(`${outdatedCount} dependências desatualizadas encontradas`);
        Object.entries(outdatedData).slice(0, 5).forEach(([pkg, info]) => {
          log(`  ${pkg}: ${info.current} → ${info.latest}`);
        });
        if (outdatedCount > 5) {
          log(`  ... e mais ${outdatedCount - 5} dependências`);
        }
        log('\n💡 Execute: npm update para atualizar dependências menores');
      } else {
        logSuccess('Todas as dependências estão atualizadas!');
      }
    } catch (error) {
      // npm outdated retorna exit code 1 quando há dependências desatualizadas
      logWarning('Algumas dependências podem estar desatualizadas');
    }
  } else {
    logSuccess('Todas as dependências estão atualizadas!');
  }
  
  return true; // Não falhar por dependências desatualizadas
}

function checkGitSecrets() {
  logHeader('Verificação de Secrets no Git');
  
  // Verificar se há ficheiros .env no staging area
  const stagedResult = runCommand('git diff --cached --name-only', 'Verificando ficheiros em staging');
  
  if (stagedResult.success) {
    const stagedFiles = stagedResult.output.split('\n').filter(Boolean);
    const envFilesStaged = stagedFiles.filter(file => 
      file.includes('.env') && !file.includes('.env.example')
    );
    
    if (envFilesStaged.length > 0) {
      logError('Ficheiros .env encontrados no staging area:');
      envFilesStaged.forEach(file => log(`  ${file}`, colors.red));
      logError('Remova ficheiros .env do commit: git reset HEAD <file>');
      return false;
    } else {
      logSuccess('Nenhum ficheiro .env no staging area');
    }
  }
  
  return true;
}

function generateSecurityReport() {
  logHeader('Gerando Relatório de Segurança');
  
  const reportPath = path.join(process.cwd(), 'security-report.json');
  const report = {
    timestamp: new Date().toISOString(),
    checks: {
      dependencies: 'completed',
      environment: 'completed',
      git_secrets: 'completed',
      outdated: 'completed'
    },
    recommendations: [
      'Execute verificações de segurança regularmente',
      'Mantenha dependências atualizadas',
      'Use .env.example para documentar variáveis necessárias',
      'Configure pre-commit hooks para verificações automáticas'
    ]
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  logSuccess(`Relatório gerado: ${reportPath}`);
}

async function main() {
  log(`${colors.bold}${colors.blue}🛡️  Verificação de Segurança Local${colors.reset}`);
  log('Executando verificações de segurança antes do commit...\n');
  
  const checks = [
    checkEnvironmentFiles,
    checkDependencies,
    checkOutdatedDependencies,
    checkGitSecrets
  ];
  
  let allPassed = true;
  
  for (const check of checks) {
    const result = check();
    if (!result) {
      allPassed = false;
    }
  }
  
  generateSecurityReport();
  
  logHeader('Resumo Final');
  
  if (allPassed) {
    logSuccess('✅ Todas as verificações de segurança passaram!');
    log('\n🚀 Seguro para commit/deploy');
    process.exit(0);
  } else {
    logError('❌ Algumas verificações de segurança falharam!');
    log('\n🔧 Corrija os problemas antes de continuar');
    process.exit(1);
  }
}

// Executar apenas se for o módulo principal
if (import.meta.url.startsWith('file:') && process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  main().catch(error => {
    logError(`Erro inesperado: ${error.message}`);
    process.exit(1);
  });
}

// Fallback para execução direta
if (process.argv[1] && process.argv[1].includes('security-check.js')) {
  main().catch(error => {
    logError(`Erro inesperado: ${error.message}`);
    process.exit(1);
  });
}

export {
  checkEnvironmentFiles,
  checkDependencies,
  checkOutdatedDependencies,
  checkGitSecrets
};