import { createRequire } from 'module';
import { Sequelize } from 'sequelize';

const require = createRequire(import.meta.url);
const migration = require('../../src/migrations/20260803000100-add-client-profile-and-photos.cjs');

describe('client profile migration', () => {
  const queryInterface = {
    sequelize: {
      transaction: jest.fn(async (callback) => callback({})),
    },
    addColumn: jest.fn(),
    createTable: jest.fn(),
    addIndex: jest.fn(),
    removeIndex: jest.fn(),
    dropTable: jest.fn(),
    removeColumn: jest.fn(),
  };

  it('cria preferências, tabela de fotos e índice do histórico', async () => {
    await migration.up(queryInterface, Sequelize);

    expect(queryInterface.addColumn).toHaveBeenCalledWith(
      'Clients', 'preferencesNotes', expect.objectContaining({ allowNull: true }), expect.any(Object),
    );
    expect(queryInterface.createTable).toHaveBeenCalledWith(
      'client_photos', expect.objectContaining({ data: expect.objectContaining({ allowNull: false }) }), expect.any(Object),
    );
    expect(queryInterface.addIndex).toHaveBeenCalledWith(
      'appointments', ['userId', 'clientId', 'startAt', 'id'],
      expect.objectContaining({ name: 'appointments_user_client_visible_start_idx' }),
    );
  });
});
