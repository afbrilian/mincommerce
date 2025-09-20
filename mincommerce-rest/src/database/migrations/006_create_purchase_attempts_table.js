exports.up = function(knex) {
  return knex.schema.createTable('purchase_attempts', function(table) {
    table.uuid('attempt_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('user_id').inTable('users').onDelete('CASCADE');
    table.integer('attempt_count').defaultTo(1);
    table.timestamp('last_attempt').defaultTo(knex.fn.now());
    table.timestamp('locked_until');
    
    // Constraints
    table.unique('user_id');
    table.check('attempt_count >= 0', 'attempt_count_check');
    
    // Indexes
    table.index('user_id');
    table.index('last_attempt');
    table.index('locked_until');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('purchase_attempts');
};
