'use strict';

async function constraintExists(queryInterface, transaction, tableRegclass, constraintName) {
  const [rows] = await queryInterface.sequelize.query(
    `
      SELECT 1
      FROM pg_constraint
      WHERE conname = :constraintName
        AND conrelid = CAST(:tableRegclass AS regclass)
      LIMIT 1
    `,
    {
      replacements: { constraintName, tableRegclass },
      transaction,
    },
  );

  return rows.length > 0;
}

async function indexExists(queryInterface, transaction, tableName, indexName) {
  const [rows] = await queryInterface.sequelize.query(
    `
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = current_schema()
        AND tablename = :tableName
        AND indexname = :indexName
      LIMIT 1
    `,
    {
      replacements: { tableName, indexName },
      transaction,
    },
  );

  return rows.length > 0;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.addColumn('Clients', 'userId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      }, { transaction });

      await queryInterface.addColumn('services', 'userId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      }, { transaction });

      const [adminRows] = await queryInterface.sequelize.query(
        "SELECT id FROM users WHERE username = 'admin' ORDER BY id ASC LIMIT 1",
        { transaction },
      );

      let defaultUserId = adminRows?.[0]?.id;

      if (!defaultUserId) {
        const [firstUserRows] = await queryInterface.sequelize.query(
          'SELECT id FROM users ORDER BY id ASC LIMIT 1',
          { transaction },
        );

        defaultUserId = firstUserRows?.[0]?.id;
      }

      if (!defaultUserId) {
        throw new Error('Nenhum usuario encontrado para backfill de clients/services.');
      }

      await queryInterface.sequelize.query(
        'UPDATE "Clients" SET "userId" = :defaultUserId WHERE "userId" IS NULL',
        {
          replacements: { defaultUserId },
          transaction,
        },
      );

      await queryInterface.sequelize.query(
        'UPDATE services SET "userId" = :defaultUserId WHERE "userId" IS NULL',
        {
          replacements: { defaultUserId },
          transaction,
        },
      );

      const possibleEmailConstraints = ['Clients_email_key', 'clients_email_key', 'clients_email_unique_legacy'];
      for (const constraintName of possibleEmailConstraints) {
        if (await constraintExists(queryInterface, transaction, '"Clients"', constraintName)) {
          await queryInterface.removeConstraint('Clients', constraintName, { transaction });
        }
      }

      await queryInterface.changeColumn('Clients', 'userId', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      }, { transaction });

      await queryInterface.changeColumn('services', 'userId', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      }, { transaction });

      await queryInterface.addConstraint('Clients', {
        fields: ['userId', 'email'],
        type: 'unique',
        name: 'clients_user_email_unique',
        transaction,
      });

      await queryInterface.addIndex('Clients', ['userId'], {
        name: 'clients_user_id_idx',
        transaction,
      });

      await queryInterface.addIndex('services', ['userId'], {
        name: 'services_user_id_idx',
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      if (await constraintExists(queryInterface, transaction, '"Clients"', 'clients_user_email_unique')) {
        await queryInterface.removeConstraint('Clients', 'clients_user_email_unique', { transaction });
      }

      if (await indexExists(queryInterface, transaction, 'Clients', 'clients_user_id_idx')) {
        await queryInterface.removeIndex('Clients', 'clients_user_id_idx', { transaction });
      }

      if (await indexExists(queryInterface, transaction, 'services', 'services_user_id_idx')) {
        await queryInterface.removeIndex('services', 'services_user_id_idx', { transaction });
      }

      await queryInterface.removeColumn('Clients', 'userId', { transaction });
      await queryInterface.removeColumn('services', 'userId', { transaction });

      await queryInterface.addConstraint('Clients', {
        fields: ['email'],
        type: 'unique',
        name: 'clients_email_unique_legacy',
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
