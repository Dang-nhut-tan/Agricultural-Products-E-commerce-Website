"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const foreignKeys = await queryInterface.getForeignKeyReferencesForTable("inventory_transactions");
    const batchForeignKey = foreignKeys.find((key) =>
      key.columnName === "batch_id" && key.referencedTableName === "product_batches"
    );

    if (batchForeignKey) {
      await queryInterface.removeConstraint("inventory_transactions", batchForeignKey.constraintName);
    }

    await queryInterface.changeColumn("inventory_transactions", "batch_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addConstraint("inventory_transactions", {
      fields: ["batch_id"],
      type: "foreign key",
      name: "inventory_transactions_batch_id_fk",
      references: { table: "product_batches", field: "id" },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint("inventory_transactions", "inventory_transactions_batch_id_fk");
    await queryInterface.addConstraint("inventory_transactions", {
      fields: ["batch_id"],
      type: "foreign key",
      name: "inventory_transactions_batch_id_fk",
      references: { table: "product_batches", field: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  },
};
