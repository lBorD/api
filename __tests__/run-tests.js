#!/usr/bin/env node

/**
 * Script para executar testes de forma organizada
 * Uso: node __tests__/run-tests.js [opção]
 * 
 * Opções:
 * --unit: Executa apenas testes unitários
 * --integration: Executa apenas testes de integração
 * --coverage: Executa testes com cobertura
 * --watch: Executa testes em modo watch
 * --all: Executa todos os testes (padrão)
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = process.argv.slice(2);
const option = args[0] || '--all';

const testCommands = {
  '--unit': 'npm test -- __tests__/controllers/ __tests__/middlewares/ __tests__/utils/',
  '--integration': 'npm test -- __tests__/routes/ __tests__/integration/',
  '--coverage': 'npm test -- --coverage',
  '--watch': 'npm test -- --watch',
  '--all': 'npm test'
};

const command = testCommands[option];

if (!command) {
  console.error('Opção inválida. Use uma das seguintes opções:');
  console.error('  --unit: Testes unitários');
  console.error('  --integration: Testes de integração');
  console.error('  --coverage: Testes com cobertura');
  console.error('  --watch: Testes em modo watch');
  console.error('  --all: Todos os testes (padrão)');
  process.exit(1);
}

console.log(`Executando: ${command}`);
console.log('='.repeat(50));

try {
  execSync(command, { 
    stdio: 'inherit',
    cwd: join(__dirname, '..')
  });
  console.log('\n✅ Todos os testes passaram!');
} catch (error) {
  console.error('\n❌ Alguns testes falharam!');
  process.exit(1);
} 