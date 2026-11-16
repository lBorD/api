'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // null = duracao derivada da soma dos servicos, que e o caso de todos os
    // agendamentos anteriores a esta migration.
    await queryInterface.addColumn('appointments', 'durationMinutes', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('appointments', 'durationMinutes');
  },
};
