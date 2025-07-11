// Configuração global do Jest para ES modules
import { jest } from '@jest/globals';

// Tornar jest disponível globalmente
global.jest = jest;

// Definir variáveis de ambiente necessárias para o Sequelize
env('DB_NAME', 'test_db');
env('DB_USER', 'test_user');
env('DB_PASSWORD', 'test_password');
env('DB_HOST', 'localhost');
env('DB_DIALECT', 'postgres');
env('JWT_SECRET', 'test-secret-key');
env('NODE_ENV', 'test');

function env(key, value) {
  if (!process.env[key]) process.env[key] = value;
}

// Mock do módulo Sequelize
const DataTypes = {
  STRING: 'STRING',
  INTEGER: 'INTEGER',
  DATE: 'DATE',
  TEXT: 'TEXT',
  BOOLEAN: 'BOOLEAN'
};

// Mock do Op do Sequelize
const Op = {
  like: Symbol.for('like'),
  gt: Symbol.for('gt'),
  and: Symbol.for('and'),
  or: Symbol.for('or')
};

jest.mock('sequelize', () => {
  const mSequelize = {
    authenticate: jest.fn().mockResolvedValue(),
    define: jest.fn().mockReturnValue({
      sync: jest.fn().mockResolvedValue(),
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      findByPk: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue([1]),
      destroy: jest.fn().mockResolvedValue(1),
      findAndCountAll: jest.fn().mockResolvedValue({ count: 0, rows: [] })
    }),
    sync: jest.fn().mockResolvedValue()
  };

  const Sequelize = jest.fn(() => mSequelize);
  Sequelize.DataTypes = DataTypes;

  return {
    Sequelize,
    DataTypes,
    Op
  };
});

// Mock do bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn().mockResolvedValue(true),
  hash: jest.fn().mockResolvedValue('hashedPassword')
}));

// Mock do jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn().mockReturnValue({ id: 1 })
}));

// Mock do libphonenumber-js
const mockParsePhoneNumberFromString = jest.fn();
jest.mock('libphonenumber-js', () => ({
  parsePhoneNumberFromString: mockParsePhoneNumberFromString
}));

// Mock do validator
jest.mock('validator', () => ({
  isEmail: jest.fn().mockReturnValue(true),
  isDate: jest.fn().mockReturnValue(true)
}));

// Mock dos modelos
jest.mock('./src/models/Client.js', () => ({
  default: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    findAll: jest.fn(),
    findAndCountAll: jest.fn()
  }
}));

jest.mock('./src/models/User.js', () => ({
  default: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    findAll: jest.fn()
  }
}));

// Mock dos utilitários
jest.mock('./src/utils/phoneValidator.js', () => ({
  isValidPhoneNumber: jest.fn().mockReturnValue({ isValid: true })
}));

jest.mock('./src/utils/emailValidator.js', () => ({
  existingClient: jest.fn().mockResolvedValue(false)
}));

// Mock dos controladores
jest.mock('./src/controllers/login.js', () => ({
  default: jest.fn((req, res) => {
    const { email, password } = req.body;
    if (email === 'test@example.com' && password === 'password123') {
      return res.status(200).json({ token: 'mock-token', success: true });
    }
    return res.status(400).json({ message: 'Email não encontrado em nossa base de dados.' });
  })
}));

jest.mock('./src/controllers/client.js', () => ({
  default: {
    registerClient: jest.fn((req, res) => res.status(201).json({ success: true })),
    getClientById: jest.fn((req, res) => res.status(200).json({ id: '1', name: 'Test Client' })),
    updateClient: jest.fn((req, res) => res.status(200).json({ id: '1', ...req.body })),
    deleteClient: jest.fn((req, res) => res.status(200).json({ message: 'Cliente excluído com sucesso.' })),
    listClients: jest.fn((req, res) => res.status(200).json({ clients: [], total: 0, page: 1, pages: 0 })),
    listClientsSync: jest.fn((req, res) => res.status(200).json([])),
    listClientsByName: jest.fn((req, res) => res.status(200).json([])),
    listClientsByLastName: jest.fn((req, res) => res.status(200).json([])),
    listClientsByPhone: jest.fn((req, res) => res.status(200).json([]))
  }
}));

jest.mock('./src/controllers/userRegister.js', () => ({
  default: {
    registerUser: jest.fn()
  }
}));

// Mock dos middlewares
jest.mock('./src/middlewares/validateClient.js', () => jest.fn((req, res, next) => next()));

// Mock da configuração do banco
jest.mock('./src/config/db.js', () => ({
  default: {
    authenticate: jest.fn().mockResolvedValue(),
    sync: jest.fn().mockResolvedValue()
  }
}));

// Disponibilizar o mock globalmente
global.mockParsePhoneNumberFromString = mockParsePhoneNumberFromString;

// Configuração de timeout para testes
jest.setTimeout(10000);

// Limpar todos os mocks após cada teste
afterEach(() => {
  jest.clearAllMocks();
});
