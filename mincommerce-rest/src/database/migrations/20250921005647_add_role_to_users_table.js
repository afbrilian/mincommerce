exports.up = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    table.string('role', 20).defaultTo('user');
    table.index('role');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    table.dropIndex('role');
    table.dropColumn('role');
  });
};