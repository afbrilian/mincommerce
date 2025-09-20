/**
 * BaseRepository Unit Tests
 * Tests for generic CRUD operations and database interactions
 */

const BaseRepository = require('./BaseRepository');
const { generateTestData, dbHelpers, redisHelpers } = require('../../tests/utils/testHelpers');

// Create a test repository class that extends BaseRepository
class TestRepository extends BaseRepository {
  constructor() {
    super('test_table');
  }
}

describe('BaseRepository - Generic CRUD Operations', () => {
  let testRepository;

  beforeEach(async () => {
    // Clear all test data
    await dbHelpers.clearAllData();
    await redisHelpers.clearAll();

    // Initialize repository
    testRepository = new TestRepository();

    // Create test table (simulate with users table for testing)
    testRepository.tableName = 'users';
  });

  describe('Basic CRUD Operations', () => {
    let testData;

    beforeEach(() => {
      testData = generateTestData.user({
        email: 'test@example.com'
      });
    });

    it('should create a new record', async () => {
      const result = await testRepository.create(testData);

      expect(result).toBeDefined();
      expect(result.user_id).toBe(testData.user_id);
      expect(result.email).toBe(testData.email);
      expect(result.created_at).toBeDefined();
    });

    it('should find record by ID', async () => {
      const created = await testRepository.create(testData);
      const found = await testRepository.findById(created.user_id);

      expect(found).toBeDefined();
      expect(found.user_id).toBe(created.user_id);
      expect(found.email).toBe(created.email);
    });

    it('should find all records with pagination', async () => {
      // Create multiple test records
      await Promise.all([
        testRepository.create(generateTestData.user({ email: 'user1@example.com' })),
        testRepository.create(generateTestData.user({ email: 'user2@example.com' })),
        testRepository.create(generateTestData.user({ email: 'user3@example.com' }))
      ]);

      const allRecords = await testRepository.findAll(2, 0);
      expect(allRecords).toHaveLength(2);

      const nextPage = await testRepository.findAll(2, 2);
      expect(nextPage).toHaveLength(1);
    });

    it('should update an existing record', async () => {
      const created = await testRepository.create(testData);
      const updateData = { email: 'updated@example.com' };

      const updated = await testRepository.update(created.user_id, updateData);

      expect(updated).toBeDefined();
      expect(updated.email).toBe(updateData.email);
      expect(updated.user_id).toBe(created.user_id);
    });

    it('should delete a record', async () => {
      const created = await testRepository.create(testData);
      const deleted = await testRepository.delete(created.user_id);

      expect(deleted).toBe(1); // Number of affected rows

      // Verify record is deleted
      const found = await testRepository.findById(created.user_id);
      expect(found).toBeUndefined();
    });

    it('should count total records', async () => {
      // Create multiple records
      await Promise.all([
        testRepository.create(generateTestData.user({ email: 'user1@example.com' })),
        testRepository.create(generateTestData.user({ email: 'user2@example.com' })),
        testRepository.create(generateTestData.user({ email: 'user3@example.com' }))
      ]);

      const count = await testRepository.count();
      expect(count).toBe(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      // Mock database error
      const originalDb = testRepository.db;
      testRepository.db = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(testRepository.create(generateTestData.user()))
        .rejects.toThrow('Database connection failed');

      // Restore original db
      testRepository.db = originalDb;
    });

    it('should handle invalid ID format', async () => {
      const invalidId = 'invalid-id-format';

      await expect(testRepository.findById(invalidId))
        .rejects.toThrow();
    });

    it('should handle non-existent record updates', async () => {
      const nonExistentId = 'non-existent-id';
      const updateData = { email: 'updated@example.com' };

      const result = await testRepository.update(nonExistentId, updateData);
      expect(result).toBeUndefined();
    });

    it('should handle non-existent record deletion', async () => {
      const nonExistentId = 'non-existent-id';
      const result = await testRepository.delete(nonExistentId);
      expect(result).toBe(0); // No rows affected
    });
  });

  describe('Data Validation', () => {
    it('should handle empty data creation', async () => {
      await expect(testRepository.create({}))
        .rejects.toThrow();
    });

    it('should handle null values', async () => {
      const testData = generateTestData.user({ email: null });

      await expect(testRepository.create(testData))
        .rejects.toThrow();
    });

    it('should handle undefined values', async () => {
      const testData = generateTestData.user({ email: undefined });

      await expect(testRepository.create(testData))
        .rejects.toThrow();
    });
  });

  describe('Pagination and Limits', () => {
    beforeEach(async () => {
      // Create 10 test records
      const promises = Array(10).fill().map((_, index) =>
        testRepository.create(generateTestData.user({
          email: `user${index}@example.com`
        }))
      );
      await Promise.all(promises);
    });

    it('should respect limit parameter', async () => {
      const records = await testRepository.findAll(5);
      expect(records).toHaveLength(5);
    });

    it('should respect offset parameter', async () => {
      const firstPage = await testRepository.findAll(5, 0);
      const secondPage = await testRepository.findAll(5, 5);

      // Records should be different
      expect(firstPage[0].user_id).not.toBe(secondPage[0].user_id);
    });

    it('should handle large limits', async () => {
      const records = await testRepository.findAll(1000);
      expect(records).toHaveLength(10); // Only 10 records exist
    });

    it('should handle negative limits and offsets', async () => {
      const records = await testRepository.findAll(-1, -1);
      expect(records).toHaveLength(10); // Should return all records
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent creates', async () => {
      const concurrentCreates = Array(5).fill().map((_, index) =>
        testRepository.create(generateTestData.user({
          email: `concurrent${index}@example.com`
        }))
      );

      const results = await Promise.all(concurrentCreates);
      expect(results).toHaveLength(5);

      // Verify all records were created
      const count = await testRepository.count();
      expect(count).toBe(5);
    });

    it('should handle concurrent reads', async () => {
      const created = await testRepository.create(generateTestData.user({
        email: 'concurrent-read@example.com'
      }));

      const concurrentReads = Array(10).fill().map(() =>
        testRepository.findById(created.user_id)
      );

      const results = await Promise.all(concurrentReads);
      results.forEach(result => {
        expect(result.user_id).toBe(created.user_id);
      });
    });

    it('should handle concurrent updates', async () => {
      const created = await testRepository.create(generateTestData.user({
        email: 'concurrent-update@example.com'
      }));

      const concurrentUpdates = Array(5).fill().map((_, index) =>
        testRepository.update(created.user_id, {
          email: `updated${index}@example.com`
        })
      );

      await Promise.all(concurrentUpdates);

      // Verify final state
      const final = await testRepository.findById(created.user_id);
      expect(final).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should handle bulk operations efficiently', async () => {
      const startTime = Date.now();

      // Create 100 records
      const bulkCreates = Array(100).fill().map((_, index) =>
        testRepository.create(generateTestData.user({
          email: `bulk${index}@example.com`
        }))
      );

      await Promise.all(bulkCreates);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(10000); // 10 seconds

      // Verify all records were created
      const count = await testRepository.count();
      expect(count).toBe(100);
    });

    it('should handle large result sets efficiently', async () => {
      // Create 50 records
      const bulkCreates = Array(50).fill().map((_, index) =>
        testRepository.create(generateTestData.user({
          email: `large${index}@example.com`
        }))
      );

      await Promise.all(bulkCreates);

      const startTime = Date.now();
      const allRecords = await testRepository.findAll(1000);
      const endTime = Date.now();

      expect(allRecords).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds
    });
  });

  describe('Data Integrity', () => {
    it('should maintain data consistency across operations', async () => {
      const testData = generateTestData.user({
        email: 'integrity@example.com'
      });

      // Create
      const created = await testRepository.create(testData);
      expect(created.email).toBe(testData.email);

      // Read
      const found = await testRepository.findById(created.user_id);
      expect(found.email).toBe(testData.email);

      // Update
      const updated = await testRepository.update(created.user_id, {
        email: 'updated-integrity@example.com'
      });
      expect(updated.email).toBe('updated-integrity@example.com');

      // Verify update
      const foundAfterUpdate = await testRepository.findById(created.user_id);
      expect(foundAfterUpdate.email).toBe('updated-integrity@example.com');

      // Delete
      await testRepository.delete(created.user_id);

      // Verify deletion
      const foundAfterDelete = await testRepository.findById(created.user_id);
      expect(foundAfterDelete).toBeUndefined();
    });
  });
});
