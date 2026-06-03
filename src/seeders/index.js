import UserSeeder from './UserSeeder.js';
import ClientSeeder from './ClientSeeder.js';
import dotenv from 'dotenv';
dotenv.config();

class SeederManager {
  constructor() {
    this.seeders = [
      new UserSeeder(),
      new ClientSeeder()
    ];
  }

  async runAll() {
    console.log('🌱 Iniciando seeders...');
    
    for (const seeder of this.seeders) {
      try {
        console.log(`📦 Executando ${seeder.constructor.name}...`);
        await seeder.run();
        console.log(`✅ ${seeder.constructor.name} concluído`);
      } catch (error) {
        console.error(`❌ Erro no ${seeder.constructor.name}:`, error.message);
      }
    }
    
    console.log('🎉 Todos os seeders foram executados!');
  }

  async undoAll() {
    console.log('🗑️ Revertendo seeders...');
    
    for (const seeder of this.seeders.reverse()) {
      try {
        console.log(`🔄 Revertendo ${seeder.constructor.name}...`);
        await seeder.undo();
        console.log(`✅ ${seeder.constructor.name} revertido`);
      } catch (error) {
        console.error(`❌ Erro ao reverter ${seeder.constructor.name}:`, error.message);
      }
    }
    
    console.log('🎉 Todos os seeders foram revertidos!');
  }
}

export default SeederManager; 