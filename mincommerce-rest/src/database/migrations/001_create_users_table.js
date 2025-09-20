exports.up = function (knex) {
  return knex.schema.createTable('users', function (table) {
    table.uuid('user_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email', 255).unique().notNullable();
    table.string('role', 20).defaultTo('user');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('email');
    table.index('role');
    table.index('created_at');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('users');
};
