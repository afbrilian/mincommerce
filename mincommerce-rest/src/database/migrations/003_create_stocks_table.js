exports.up = async function(knex) {
  await knex.schema.createTable('stocks', function(table) {
    table.uuid('stock_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('product_id').notNullable().references('product_id').inTable('products').onDelete('CASCADE');
    table.integer('total_quantity').notNullable();
    table.integer('available_quantity').notNullable();
    table.integer('reserved_quantity').defaultTo(0);
    table.timestamp('last_updated').defaultTo(knex.fn.now());
    
    // Constraints
    table.unique('product_id');
    
    // Indexes for performance
    table.index('product_id');
    table.index('available_quantity');
    table.index('last_updated');
  });
  
  // Add check constraints using raw SQL
  await knex.raw(`
    ALTER TABLE stocks 
    ADD CONSTRAINT available_quantity_check 
    CHECK (available_quantity >= 0)
  `);
  
  await knex.raw(`
    ALTER TABLE stocks 
    ADD CONSTRAINT reserved_quantity_check 
    CHECK (reserved_quantity >= 0)
  `);
  
  await knex.raw(`
    ALTER TABLE stocks 
    ADD CONSTRAINT stock_balance_check 
    CHECK (total_quantity = available_quantity + reserved_quantity)
  `);
};

exports.down = function(knex) {
  return knex.schema.dropTable('stocks');
};
