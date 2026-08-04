'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const options = { transaction };

      await queryInterface.addColumn('Clients', 'preferencesNotes', {
        type: Sequelize.TEXT,
        allowNull: true,
      }, options);

      await queryInterface.createTable('client_photos', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
        },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        clientId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          unique: true,
          references: {
            model: 'Clients',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        data: {
          type: Sequelize.BLOB,
          allowNull: false,
        },
        mimeType: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        byteSize: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        checksum: {
          type: Sequelize.STRING(64),
          allowNull: false,
        },
        width: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        height: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      }, options);

      await queryInterface.addIndex('client_photos', ['userId', 'clientId'], {
        name: 'client_photos_user_client_idx',
        transaction,
      });

      await queryInterface.addIndex('appointments', ['userId', 'clientId', 'startAt', 'id'], {
        name: 'appointments_user_client_visible_start_idx',
        where: {
          archivedAt: null,
          status: { [Sequelize.Op.ne]: 'canceled' },
        },
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const options = { transaction };

      await queryInterface.removeIndex('appointments', 'appointments_user_client_visible_start_idx', options);
      await queryInterface.dropTable('client_photos', options);
      await queryInterface.removeColumn('Clients', 'preferencesNotes', options);
    });
  },
};
