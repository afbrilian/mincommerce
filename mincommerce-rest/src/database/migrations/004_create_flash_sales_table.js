exports.up = async function(knex) {
  await knex.schema.createTable('flash_sales', function(table) {
    table.uuid('sale_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('product_id').notNullable().references('product_id').inTable('products').onDelete('CASCADE');
    table.timestamp('start_time').notNullable();
    table.timestamp('end_time').notNullable();
    table.string('status', 20).defaultTo('upcoming'); // upcoming, active, ended
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index('product_id');
    table.index('start_time');
    table.index('end_time');
    table.index('status');
    table.index(['start_time', 'end_time']);
  });
  
  // Add check constraints using raw SQL
  await knex.raw(`
    ALTER TABLE flash_sales 
    ADD CONSTRAINT end_time_after_start_time 
    CHECK (end_time > start_time)
  `);
  
  await knex.raw(`
    ALTER TABLE flash_sales 
    ADD CONSTRAINT status_check 
    CHECK (status IN ('upcoming', 'active', 'ended'))
  `);
};

exports.down = function(knex) {
  return knex.schema.dropTable('flash_sales');
};
