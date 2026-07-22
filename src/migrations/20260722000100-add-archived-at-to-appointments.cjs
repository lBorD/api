'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('appointments', 'archivedAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addIndex('appointments', ['userId', 'archivedAt', 'startAt'], {
      name: 'appointments_user_archived_start_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('appointments', 'appointments_user_archived_start_idx');
    await queryInterface.removeColumn('appointments', 'archivedAt');
  },
};
