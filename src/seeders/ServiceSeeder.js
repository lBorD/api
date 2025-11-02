import Service from '../models/Service.js';

class ServiceSeeder {
  constructor() {
    this.services = [
      {
        name: 'Maquiagem Social',
        price: 150.00,
        estimatedTime: 60,
        cost: 30.00,
        isActive: true
      },
      {
        name: 'Maquiagem para Noiva',
        price: 350.00,
        estimatedTime: 120,
        cost: 70.00,
        isActive: true
      },
      {
        name: 'Maquiagem para Festas',
        price: 200.00,
        estimatedTime: 90,
        cost: 40.00,
        isActive: true
      },
      {
        name: 'Maquiagem Artística',
        price: 250.00,
        estimatedTime: 120,
        cost: 50.00,
        isActive: true
      },
      {
        name: 'Design de Sobrancelhas',
        price: 80.00,
        estimatedTime: 30,
        cost: 15.00,
        isActive: true
      },
      {
        name: 'Aplicação de Cílios',
        price: 100.00,
        estimatedTime: 45,
        cost: 25.00,
        isActive: true
      },
      {
        name: 'Penteado Simples',
        price: 120.00,
        estimatedTime: 60,
        cost: 20.00,
        isActive: true
      },
      {
        name: 'Penteado para Noiva',
        price: 300.00,
        estimatedTime: 120,
        cost: 50.00,
        isActive: true
      },
      {
        name: 'Day Makeup',
        price: 100.00,
        estimatedTime: 45,
        cost: 20.00,
        isActive: true
      },
      {
        name: 'Automaquiagem (Aula)',
        price: 180.00,
        estimatedTime: 90,
        cost: 30.00,
        isActive: true
      }
    ];
  }

  async run() {
    console.log('💄 Criando serviços de exemplo...');
    
    for (const serviceData of this.services) {
      try {
        const existingService = await Service.findOne({
          where: { name: serviceData.name }
        });

        if (!existingService) {
          await Service.create(serviceData);
          console.log(`✅ Serviço "${serviceData.name}" criado`);
        } else {
          console.log(`⏭️ Serviço "${serviceData.name}" já existe`);
        }
      } catch (error) {
        console.error(`❌ Erro ao criar serviço ${serviceData.name}:`, error.message);
      }
    }
  }

  async undo() {
    console.log('🗑️ Removendo serviços de exemplo...');
    
    for (const serviceData of this.services) {
      try {
        await Service.destroy({
          where: { name: serviceData.name }
        });
        console.log(`✅ Serviço "${serviceData.name}" removido`);
      } catch (error) {
        console.error(`❌ Erro ao remover serviço ${serviceData.name}:`, error.message);
      }
    }
  }
}

export default ServiceSeeder;
