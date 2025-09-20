const { v4: uuidv4 } = require('uuid');

exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('orders').del();
  await knex('flash_sales').del();
  await knex('stocks').del();
  await knex('products').del();
  await knex('users').del();

  // Generate dynamic UUIDs
  const productId = uuidv4();
  const saleId = uuidv4();
  const userId1 = uuidv4();
  const userId2 = uuidv4();
  const userId3 = uuidv4();

  // Insert sample data
  const products = await knex('products').insert([
    {
      product_id: productId,
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
      sale_id: saleId,
      product_id: products[0].product_id,
      start_time: new Date(Date.now() + 60000), // 1 minute from now
      end_time: new Date(Date.now() + 7200000), // 2 hours from now
      status: 'upcoming'
    }
  ]).returning('*');

  // Insert some test users with dynamic emails
  const timestamp = Date.now();
  const users = await knex('users').insert([
    {
      user_id: userId1,
      email: `testuser1-${timestamp}@example.com`
    },
    {
      user_id: userId2,
      email: `testuser2-${timestamp}@example.com`
    },
    {
      user_id: userId3,
      email: `testuser3-${timestamp}@example.com`
    }
  ]).returning('*');

  console.log('Sample data seeded successfully!');
  console.log(`Product ID: ${products[0].product_id}`);
  console.log(`Flash Sale ID: ${flashSales[0].sale_id}`);
  console.log(`Test User IDs: ${users.map(u => u.user_id).join(', ')}`);
};
