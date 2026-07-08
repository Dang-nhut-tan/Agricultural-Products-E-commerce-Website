"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex("product_batches", ["batch_code"], {
      unique: true,
      name: "product_batches_batch_code_unique",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      "product_batches",
      "product_batches_batch_code_unique"
    );
  },
};
