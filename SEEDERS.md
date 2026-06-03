# 🌱 Seeders - BeautyAPP

Este documento explica como usar os seeders para popular o banco de dados com dados de exemplo.

## 📋 O que são os Seeders?

Os seeders são scripts que inserem dados iniciais no banco de dados. Eles são úteis para:
- Desenvolvimento com dados de exemplo
- Testes com dados consistentes
- Setup inicial do projeto
- Evitar retrabalho após reset do banco (Render)

## 🚀 Como usar

### Executar todos os seeders:
```bash
npm run seed
```

### Reverter todos os seeders:
```bash
npm run seed:undo
```

### Setup completo (migrations + seeders):
```bash
npm run db:setup
```

## 📊 Dados criados

### 👥 Usuários (5 usuários)
- **admin** - admin@beautyapp.com / admin123
- **maria** - maria@beautyapp.com / maria123
- **joao** - joao@beautyapp.com / joao123
- **ana** - ana@beautyapp.com / ana123
- **teste** - teste@beautyapp.com / teste123

### 👥 Clientes (10 clientes)
- Maria Silva Santos
- João Oliveira Costa
- Ana Pereira Lima
- Carlos Rodrigues Ferreira
- Fernanda Almeida Souza
- Roberto Nascimento Silva
- Patrícia Costa Mendes
- Lucas Martins Oliveira
- Juliana Ferreira Santos
- Ricardo Lima Costa

## 🔧 Estrutura dos Seeders

```
src/seeders/
├── index.js          # Gerenciador principal
├── UserSeeder.js     # Seeder de usuários
└── ClientSeeder.js   # Seeder de clientes
```

## 📝 Adicionando novos seeders

1. Crie um novo arquivo em `src/seeders/`
2. Implemente os métodos `run()` e `undo()`
3. Adicione o seeder no `src/seeders/index.js`

### Exemplo:
```javascript
class NewSeeder {
  async run() {
    // Lógica para criar dados
  }
  
  async undo() {
    // Lógica para remover dados
  }
}
```

## ⚠️ Importante

- Os seeders verificam se os dados já existem antes de criar
- Senhas são automaticamente criptografadas pelo modelo User
- Use apenas para desenvolvimento/testes
- Não use dados reais em produção

## 🎯 Comandos úteis

```bash
# Apenas migrations
npm run db:migrate

# Apenas seeders
npm run seed

# Setup completo
npm run db:setup

# Limpar tudo
npm run db:migrate:undo:all
npm run seed:undo
``` 