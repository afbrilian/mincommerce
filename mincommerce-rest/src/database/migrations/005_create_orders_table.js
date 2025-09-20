exports.up = async function(knex) {
  await knex.schema.createTable('orders', function(table) {
    table.uuid('order_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('user_id').inTable('users').onDelete('CASCADE');
    table.uuid('product_id').notNullable().references('product_id').inTable('products').onDelete('CASCADE');
    table.string('status', 20).defaultTo('pending'); // pending, confirmed, failed
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Constraints
    table.unique(['user_id', 'product_id']); // One item per user
    
    // Indexes for performance
    table.index('user_id');
    table.index('product_id');
    table.index('status');
    table.index('created_at');
    table.index(['user_id', 'product_id']);
  });
  
  // Add check constraints using raw SQL
  await knex.raw(`
    ALTER TABLE orders 
    ADD CONSTRAINT status_check 
    CHECK (status IN ('pending', 'confirmed', 'failed'))
  `);
};

exports.down = function(knex) {
  return knex.schema.dropTable('orders');
};
