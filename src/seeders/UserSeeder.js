import User from '../models/User.js';

class UserSeeder {
  constructor() {
    this.users = [
      {
        username: 'admin',
        email: 'admin@beautyapp.com',
        password: 'admin123',
        active: true
      }
    ];
  }

  async run() {
    console.log('👥 Criando usuários de exemplo...');
    
    for (const userData of this.users) {
      try {
        // Verifica se o usuário já existe
        const existingUser = await User.findOne({
          where: { email: userData.email }
        });

        if (!existingUser) {
          await User.create(userData);
          console.log(`✅ Usuário ${userData.username} criado`);
        } else {
          console.log(`⏭️ Usuário ${userData.username} já existe`);
        }
      } catch (error) {
        console.error(`❌ Erro ao criar usuário ${userData.username}:`, error.message);
      }
    }
  }

  async undo() {
    console.log('🗑️ Removendo usuários de exemplo...');
    
    for (const userData of this.users) {
      try {
        await User.destroy({
          where: { email: userData.email }
        });
        console.log(`✅ Usuário ${userData.username} removido`);
      } catch (error) {
        console.error(`❌ Erro ao remover usuário ${userData.username}:`, error.message);
      }
    }
  }
}

export default UserSeeder; 