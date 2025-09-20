exports.up = function(knex) {
  return knex.schema.createTable('products', function(table) {
    table.uuid('product_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 255).notNullable();
    table.text('description');
    table.decimal('price', 10, 2).notNullable();
    table.string('image_url', 500);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index('name');
    table.index('created_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('products');
};
