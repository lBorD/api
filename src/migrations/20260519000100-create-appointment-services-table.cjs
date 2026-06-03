'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.createTable('appointment_services', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
        },
        appointmentId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'appointments',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        serviceId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'services',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        serviceName: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        price: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
        },
        estimatedTime: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        sortOrder: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
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
      }, { transaction });

      await queryInterface.addIndex('appointment_services', ['appointmentId'], {
        name: 'appointment_services_appointment_id_idx',
        transaction,
      });

      await queryInterface.addIndex('appointment_services', ['serviceId'], {
        name: 'appointment_services_service_id_idx',
        transaction,
      });

      await queryInterface.addConstraint('appointment_services', {
        fields: ['appointmentId', 'serviceId'],
        type: 'unique',
        name: 'appointment_services_appointment_service_unique',
        transaction,
      });

      await queryInterface.sequelize.query(
        `
          INSERT INTO appointment_services (
            "appointmentId",
            "serviceId",
            "serviceName",
            "price",
            "estimatedTime",
            "sortOrder",
            "createdAt",
            "updatedAt"
          )
          SELECT
            a.id,
            a."serviceId",
            s.name,
            a.price,
            s."estimatedTime",
            0,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          FROM appointments a
          INNER JOIN services s ON s.id = a."serviceId"
          WHERE NOT EXISTS (
            SELECT 1
            FROM appointment_services aps
            WHERE aps."appointmentId" = a.id
              AND aps."serviceId" = a."serviceId"
          )
        `,
        { transaction },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('appointment_services');
  },
};
