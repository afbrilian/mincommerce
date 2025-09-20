exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('purchase_attempts').del();
  await knex('orders').del();
  await knex('flash_sales').del();
  await knex('stocks').del();
  await knex('products').del();
  await knex('users').del();

  // Insert sample data
  const products = await knex('products').insert([
    {
      product_id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Limited Edition Gaming Console',
      description: 'The most advanced gaming console with exclusive features and premium design.',
      price: 599.99,
      image_url: 'https://via.placeholder.com/400x300?text=Gaming+Console'
    }
  ]).returning('*');

  await knex('stocks').insert([
    {
      product_id: products[0].product_id,
      total_quantity: 1000,
      available_quantity: 1000,
      reserved_quantity: 0
    }
  ]);

  const flashSales = await knex('flash_sales').insert([
    {
      sale_id: '650e8400-e29b-41d4-a716-446655440000',
      product_id: products[0].product_id,
      start_time: new Date(Date.now() + 60000), // 1 minute from now
      end_time: new Date(Date.now() + 7200000), // 2 hours from now
      status: 'upcoming'
    }
  ]).returning('*');

  // Insert some test users
  const users = await knex('users').insert([
    {
      user_id: '750e8400-e29b-41d4-a716-446655440000',
      email: 'testuser1@example.com'
    },
    {
      user_id: '850e8400-e29b-41d4-a716-446655440000',
      email: 'testuser2@example.com'
    },
    {
      user_id: '950e8400-e29b-41d4-a716-446655440000',
      email: 'testuser3@example.com'
    }
  ]).returning('*');

  console.log('Sample data seeded successfully!');
  console.log(`Product ID: ${products[0].product_id}`);
  console.log(`Flash Sale ID: ${flashSales[0].sale_id}`);
  console.log(`Test User IDs: ${users.map(u => u.user_id).join(', ')}`);
};
