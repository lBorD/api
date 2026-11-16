'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'name', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    // owner = dona da conta; staff = funcionaria que opera a conta da dona.
    await queryInterface.addColumn('users', 'role', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'owner',
    });

    // null para a dona; para a funcionaria, o id da conta que ela opera.
    await queryInterface.addColumn('users', 'accountOwnerId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });

    await queryInterface.addIndex('users', ['accountOwnerId'], {
      name: 'users_account_owner_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('users', 'users_account_owner_idx');
    await queryInterface.removeColumn('users', 'accountOwnerId');
    await queryInterface.removeColumn('users', 'role');
    await queryInterface.removeColumn('users', 'name');
  },
};
