'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('calendar_connections', {
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
      provider: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      calendarId: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'primary',
      },
      accessTokenEncrypted: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      refreshTokenEncrypted: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      accessTokenExpiresAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      scope: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      lastSyncAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      lastSyncStatus: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      lastSyncError: {
        type: Sequelize.TEXT,
        allowNull: true,
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
    });

    await queryInterface.addIndex('calendar_connections', ['userId', 'provider'], {
      name: 'calendar_connections_user_provider_unique',
      unique: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('calendar_connections');
  },
};
