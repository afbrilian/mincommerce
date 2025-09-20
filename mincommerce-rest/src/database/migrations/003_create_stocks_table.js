exports.up = function(knex) {
  return knex.schema.createTable('stocks', function(table) {
    table.uuid('stock_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('product_id').notNullable().references('product_id').inTable('products').onDelete('CASCADE');
    table.integer('total_quantity').notNullable();
    table.integer('available_quantity').notNullable();
    table.integer('reserved_quantity').defaultTo(0);
    table.timestamp('last_updated').defaultTo(knex.fn.now());
    
    // Constraints
    table.unique('product_id');
    table.check('available_quantity >= 0', 'available_quantity_check');
    table.check('reserved_quantity >= 0', 'reserved_quantity_check');
    table.check('total_quantity = available_quantity + reserved_quantity', 'stock_balance_check');
    
    // Indexes for performance
    table.index('product_id');
    table.index('available_quantity');
    table.index('last_updated');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('stocks');
};
