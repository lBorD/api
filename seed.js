import dotenv from 'dotenv';
import SeederManager from './src/seeders/index.js';

// Carrega as variáveis de ambiente
dotenv.config();

async function main() {
  try {
    const seederManager = new SeederManager();
    
    // Verifica se deve reverter os seeders
    const shouldUndo = process.argv.includes('--undo');
    
    if (shouldUndo) {
      await seederManager.undoAll();
    } else {
      await seederManager.runAll();
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao executar seeders:', error);
    process.exit(1);
  }
}

main(); 