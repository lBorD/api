import Client from '../models/Client.js';

class ClientSeeder {
  constructor() {
    this.clients = [
      {
        name: 'Maria',
        lastName: 'Silva Santos',
        phone: '+5511999999999',
        email: 'maria.silva@email.com',
        address: 'Rua das Flores, 123 - São Paulo, SP',
        birthDate: '1990-05-15'
      },
      {
        name: 'João',
        lastName: 'Oliveira Costa',
        phone: '+5511888888888',
        email: 'joao.oliveira@email.com',
        address: 'Av. Paulista, 1000 - São Paulo, SP',
        birthDate: '1985-08-22'
      },
      {
        name: 'Ana',
        lastName: 'Pereira Lima',
        phone: '+5511777777777',
        email: 'ana.pereira@email.com',
        address: 'Rua Augusta, 500 - São Paulo, SP',
        birthDate: '1992-12-03'
      },
      {
        name: 'Carlos',
        lastName: 'Rodrigues Ferreira',
        phone: '+5511666666666',
        email: 'carlos.rodrigues@email.com',
        address: 'Rua Oscar Freire, 200 - São Paulo, SP',
        birthDate: '1988-03-10'
      },
      {
        name: 'Fernanda',
        lastName: 'Almeida Souza',
        phone: '+5511555555555',
        email: 'fernanda.almeida@email.com',
        address: 'Av. Brigadeiro Faria Lima, 1500 - São Paulo, SP',
        birthDate: '1995-07-18'
      },
      {
        name: 'Roberto',
        lastName: 'Nascimento Silva',
        phone: '+5511444444444',
        email: 'roberto.nascimento@email.com',
        address: 'Rua Pamplona, 800 - São Paulo, SP',
        birthDate: '1983-11-25'
      },
      {
        name: 'Patrícia',
        lastName: 'Costa Mendes',
        phone: '+5511333333333',
        email: 'patricia.costa@email.com',
        address: 'Rua Haddock Lobo, 300 - São Paulo, SP',
        birthDate: '1991-04-12'
      },
      {
        name: 'Lucas',
        lastName: 'Martins Oliveira',
        phone: '+5511222222222',
        email: 'lucas.martins@email.com',
        address: 'Av. Rebouças, 1200 - São Paulo, SP',
        birthDate: '1987-09-30'
      },
      {
        name: 'Juliana',
        lastName: 'Ferreira Santos',
        phone: '+5511111111111',
        email: 'juliana.ferreira@email.com',
        address: 'Rua Teodoro Sampaio, 600 - São Paulo, SP',
        birthDate: '1993-01-08'
      },
      {
        name: 'Ricardo',
        lastName: 'Lima Costa',
        phone: '+5511000000000',
        email: 'ricardo.lima@email.com',
        address: 'Av. Sumaré, 900 - São Paulo, SP',
        birthDate: '1986-06-14'
      }
    ];
  }

  async run() {
    console.log('👥 Criando clientes de exemplo...');
    
    for (const clientData of this.clients) {
      try {
        // Verifica se o cliente já existe
        const existingClient = await Client.findOne({
          where: { email: clientData.email }
        });

        if (!existingClient) {
          await Client.create(clientData);
          console.log(`✅ Cliente ${clientData.name} ${clientData.lastName} criado`);
        } else {
          console.log(`⏭️ Cliente ${clientData.name} ${clientData.lastName} já existe`);
        }
      } catch (error) {
        console.error(`❌ Erro ao criar cliente ${clientData.name}:`, error.message);
      }
    }
  }

  async undo() {
    console.log('🗑️ Removendo clientes de exemplo...');
    
    for (const clientData of this.clients) {
      try {
        await Client.destroy({
          where: { email: clientData.email }
        });
        console.log(`✅ Cliente ${clientData.name} ${clientData.lastName} removido`);
      } catch (error) {
        console.error(`❌ Erro ao remover cliente ${clientData.name}:`, error.message);
      }
    }
  }
}

export default ClientSeeder; 