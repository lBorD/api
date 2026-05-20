import { jest } from '@jest/globals';

global.jest = jest;

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

const DataTypes = {
  STRING: 'STRING',
  INTEGER: 'INTEGER',
  DATE: 'DATE',
  TEXT: 'TEXT',
  BOOLEAN: 'BOOLEAN',
  DECIMAL: () => 'DECIMAL',
};

const Op = {
  like: Symbol.for('like'),
  iLike: Symbol.for('iLike'),
  in: Symbol.for('in'),
  gt: Symbol.for('gt'),
  lt: Symbol.for('lt'),
  ne: Symbol.for('ne'),
  and: Symbol.for('and'),
  or: Symbol.for('or'),
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
      bulkCreate: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue([1]),
      destroy: jest.fn().mockResolvedValue(1),
      findAndCountAll: jest.fn().mockResolvedValue({ count: 0, rows: [] }),
      belongsTo: jest.fn(),
      hasMany: jest.fn(),
      associations: {},
    }),
    sync: jest.fn().mockResolvedValue(),
    transaction: jest.fn(async (callback) => callback({})),
  };

  const Sequelize = jest.fn(() => mSequelize);
  Sequelize.DataTypes = DataTypes;

  return {
    Sequelize,
    DataTypes,
    Op,
  };
});

jest.mock('bcrypt', () => ({
  compare: jest.fn().mockResolvedValue(true),
  hash: jest.fn().mockResolvedValue('hashedPassword'),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn((token, secret, callback) => {
    if (typeof callback === 'function') {
      callback(null, { id: 1 });
    }

    return { id: 1 };
  }),
}));

const mockParsePhoneNumberFromString = jest.fn();
jest.mock('libphonenumber-js', () => ({
  parsePhoneNumberFromString: mockParsePhoneNumberFromString,
}));

jest.mock('validator', () => ({
  isEmail: jest.fn().mockReturnValue(true),
  isDate: jest.fn().mockReturnValue(true),
}));

jest.mock('./src/models/Client.js', () => ({
  default: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    findAll: jest.fn().mockResolvedValue([]),
    findAndCountAll: jest.fn().mockResolvedValue({ count: 0, rows: [] }),
  },
}));

jest.mock('./src/models/User.js', () => ({
  default: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    findAll: jest.fn(),
  },
}));

jest.mock('./src/models/Service.js', () => ({
  default: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    findAll: jest.fn().mockResolvedValue([]),
    findAndCountAll: jest.fn().mockResolvedValue({ count: 0, rows: [] }),
  },
}));

jest.mock('./src/models/Appointment.js', () => ({
  default: {
    associations: {},
    belongsTo: jest.fn(),
    hasMany: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    bulkCreate: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    findAll: jest.fn().mockResolvedValue([]),
    findAndCountAll: jest.fn().mockResolvedValue({ count: 0, rows: [] }),
  },
}));

jest.mock('./src/models/AppointmentService.js', () => ({
  default: {
    associations: {},
    belongsTo: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    bulkCreate: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    findAll: jest.fn().mockResolvedValue([]),
    findAndCountAll: jest.fn().mockResolvedValue({ count: 0, rows: [] }),
  },
}));

jest.mock('./src/utils/phoneValidator.js', () => ({
  isValidPhoneNumber: jest.fn().mockReturnValue({ isValid: true, formatted: '+5511999999999' }),
}));

jest.mock('./src/utils/emailValidator.js', () => ({
  existingClient: jest.fn().mockResolvedValue(false),
}));

jest.mock('./src/controllers/login.js', () => ({
  default: jest.fn((req, res) => {
    const { email, password } = req.body;
    if (email === 'test@example.com' && password === 'password123') {
      return res.status(200).json({ token: 'mock-token', success: true });
    }
    return res.status(400).json({ message: 'Email não encontrado em nossa base de dados.' });
  }),
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
    listClientsByPhone: jest.fn((req, res) => res.status(200).json([])),
  },
}));

jest.mock('./src/controllers/service.js', () => ({
  default: {
    registerService: jest.fn((req, res) => res.status(201).json({ success: true })),
    listServices: jest.fn((req, res) => res.status(200).json({ services: [], total: 0, page: 1, pages: 0 })),
    listActiveServices: jest.fn((req, res) => res.status(200).json([])),
    getServiceById: jest.fn((req, res) => res.status(200).json({ id: '1', name: 'Service' })),
    updateService: jest.fn((req, res) => res.status(200).json({ id: '1', ...req.body })),
    deleteService: jest.fn((req, res) => res.status(200).json({ success: true })),
  },
}));

jest.mock('./src/controllers/appointment.js', () => ({
  default: {
    listAppointments: jest.fn((req, res) => res.status(200).json([])),
    suggestSlots: jest.fn((req, res) => res.status(200).json([])),
    createAppointment: jest.fn((req, res) => res.status(201).json({ id: 1 })),
    updateAppointment: jest.fn((req, res) => res.status(200).json({ id: 1 })),
    updateAppointmentStatus: jest.fn((req, res) => res.status(200).json({ id: 1, status: req.body.status })),
  },
}));

jest.mock('./src/controllers/userRegister.js', () => ({
  default: {
    registerUser: jest.fn(),
  },
}));

jest.mock('./src/middlewares/validateClient.js', () => jest.fn((req, res, next) => next()));
jest.mock('./src/middlewares/validateClientUpdate.js', () => jest.fn((req, res, next) => next()));
jest.mock('./src/middlewares/validateService.js', () => jest.fn((req, res, next) => next()));

jest.mock('./src/config/db.js', () => ({
  default: {
    authenticate: jest.fn().mockResolvedValue(),
    sync: jest.fn().mockResolvedValue(),
    transaction: jest.fn(async (callback) => callback({})),
  },
}));

global.mockParsePhoneNumberFromString = mockParsePhoneNumberFromString;

jest.setTimeout(10000);

afterEach(() => {
  jest.clearAllMocks();
});

