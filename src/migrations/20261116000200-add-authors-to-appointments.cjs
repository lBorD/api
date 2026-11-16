'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const authorColumn = {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    };

    // null nos agendamentos anteriores a esta migration: autor nao registrado.
    await queryInterface.addColumn('appointments', 'createdByUserId', authorColumn);
    await queryInterface.addColumn('appointments', 'updatedByUserId', authorColumn);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('appointments', 'updatedByUserId');
    await queryInterface.removeColumn('appointments', 'createdByUserId');
  },
};
