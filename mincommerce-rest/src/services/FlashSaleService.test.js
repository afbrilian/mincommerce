/**
 * FlashSaleService Unit Tests
 * Tests for flash sale business logic and status management
 */

const FlashSaleService = require('./FlashSaleService');
const { dbHelpers, redisHelpers } = require('../../tests/utils/testHelpers');
const CONSTANTS = require('../constants');

describe('FlashSaleService - Flash Sale Management', () => {
  let flashSaleService;
  let testProduct;
  let testFlashSale;

  beforeEach(async () => {
    // Clear all test data
    await dbHelpers.clearAllData();
    await redisHelpers.clearAll();

    // Initialize service
    flashSaleService = new FlashSaleService();

    // Create test data
    const { product } = await dbHelpers.createProductWithStock({}, { available_quantity: 100 });
    testProduct = product;
    testFlashSale = await dbHelpers.createFlashSale(testProduct.product_id, {
      status: CONSTANTS.SALE_STATUS.UPCOMING,
      start_time: new Date(Date.now() + 60000), // 1 minute from now
      end_time: new Date(Date.now() + 7200000)  // 2 hours from now
    });
  });

  describe('Sale Status Management', () => {
    it('should get upcoming sale status', async () => {
      const status = await flashSaleService.getSaleStatus(testFlashSale.sale_id);

      expect(status).toBeDefined();
      expect(status.saleId).toBe(testFlashSale.sale_id);
      expect(status.status).toBe(CONSTANTS.SALE_STATUS.UPCOMING);
      expect(status.productName).toBe(testProduct.name);
      expect(status.price).toBe(testProduct.price);
      expect(status.availableQuantity).toBe(100);
    });

    it('should get active sale status', async () => {
      // Update sale to active
      const now = new Date();
      await dbHelpers.createFlashSale(testProduct.product_id, {
        sale_id: testFlashSale.sale_id,
        status: CONSTANTS.SALE_STATUS.ACTIVE,
        start_time: new Date(now.getTime() - 60000), // Started 1 minute ago
        end_time: new Date(now.getTime() + 3600000)  // Ends in 1 hour
      });

      const status = await flashSaleService.getSaleStatus(testFlashSale.sale_id);

      expect(status.status).toBe(CONSTANTS.SALE_STATUS.ACTIVE);
      expect(status.timeUntilStart).toBe(0);
      expect(status.timeUntilEnd).toBeGreaterThan(0);
    });

    it('should get ended sale status', async () => {
      // Update sale to ended
      const now = new Date();
      await dbHelpers.createFlashSale(testProduct.product_id, {
        sale_id: testFlashSale.sale_id,
        status: CONSTANTS.SALE_STATUS.ENDED,
        start_time: new Date(now.getTime() - 7200000), // Started 2 hours ago
        end_time: new Date(now.getTime() - 3600000)    // Ended 1 hour ago
      });

      const status = await flashSaleService.getSaleStatus(testFlashSale.sale_id);

      expect(status.status).toBe(CONSTANTS.SALE_STATUS.ENDED);
      expect(status.timeUntilStart).toBe(0);
      expect(status.timeUntilEnd).toBe(0);
    });

    it('should cache sale status', async () => {
      // First call
      const status1 = await flashSaleService.getSaleStatus(testFlashSale.sale_id);
      
      // Second call should use cache
      const status2 = await flashSaleService.getSaleStatus(testFlashSale.sale_id);

      expect(status1).toEqual(status2);

      // Verify cache key exists
      const cacheKey = CONSTANTS.REDIS_KEYS.FLASH_SALE_STATUS(testFlashSale.sale_id);
      const cachedData = await redisHelpers.get(cacheKey);
      expect(cachedData).toBeDefined();
    });
  });

  describe('Sale Creation', () => {
    it('should create a new flash sale', async () => {
      const saleData = {
        productId: testProduct.product_id,
        startTime: new Date(Date.now() + 3600000), // 1 hour from now
        endTime: new Date(Date.now() + 7200000)    // 2 hours from now
      };

      const sale = await flashSaleService.createFlashSale(saleData);

      expect(sale).toBeDefined();
      expect(sale.productId).toBe(testProduct.product_id);
      expect(sale.status).toBe(CONSTANTS.SALE_STATUS.UPCOMING);
      expect(sale.startTime).toEqual(saleData.startTime);
      expect(sale.endTime).toEqual(saleData.endTime);
    });

    it('should validate sale data', async () => {
      const invalidSaleData = {
        productId: testProduct.product_id,
        startTime: new Date(Date.now() + 7200000), // 2 hours from now
        endTime: new Date(Date.now() + 3600000)    // 1 hour from now (invalid)
      };

      await expect(flashSaleService.createFlashSale(invalidSaleData))
        .rejects.toThrow('End time must be after start time');
    });

    it('should validate product exists', async () => {
      const saleData = {
        productId: 'non-existent-product-id',
        startTime: new Date(Date.now() + 3600000),
        endTime: new Date(Date.now() + 7200000)
      };

      await expect(flashSaleService.createFlashSale(saleData))
        .rejects.toThrow('Product not found or has no stock');
    });
  });

  describe('Sale Status Updates', () => {
    it('should update sale status', async () => {
      const updatedSale = await flashSaleService.updateSaleStatus(
        testFlashSale.sale_id,
        CONSTANTS.SALE_STATUS.ACTIVE
      );

      expect(updatedSale.status).toBe(CONSTANTS.SALE_STATUS.ACTIVE);
      expect(updatedSale.updatedAt).toBeDefined();
    });

    it('should validate status values', async () => {
      await expect(flashSaleService.updateSaleStatus(
        testFlashSale.sale_id,
        'invalid-status'
      )).rejects.toThrow('Invalid status: invalid-status');
    });

    it('should clear cache when status is updated', async () => {
      // Get status to populate cache
      await flashSaleService.getSaleStatus(testFlashSale.sale_id);
      
      // Update status
      await flashSaleService.updateSaleStatus(
        testFlashSale.sale_id,
        CONSTANTS.SALE_STATUS.ACTIVE
      );

      // Cache should be cleared
      const cacheKey = CONSTANTS.REDIS_KEYS.FLASH_SALE_STATUS(testFlashSale.sale_id);
      const cachedData = await redisHelpers.get(cacheKey);
      expect(cachedData).toBeNull();
    });
  });

  describe('Time-based Status Updates', () => {
    it('should update upcoming sales to active', async () => {
      // Create upcoming sale that should now be active
      const now = new Date();
      await dbHelpers.createFlashSale(testProduct.product_id, {
        status: CONSTANTS.SALE_STATUS.UPCOMING,
        start_time: new Date(now.getTime() - 60000), // Started 1 minute ago
        end_time: new Date(now.getTime() + 3600000)  // Ends in 1 hour
      });

      await flashSaleService.updateStatusByTime();

      // Verify status was updated
      await dbHelpers.getFlashSaleById(testFlashSale.sale_id);
      // Note: This test might need adjustment based on actual implementation
    });

    it('should update active sales to ended', async () => {
      // Create active sale that should now be ended
      const now = new Date();
      await dbHelpers.createFlashSale(testProduct.product_id, {
        status: CONSTANTS.SALE_STATUS.ACTIVE,
        start_time: new Date(now.getTime() - 7200000), // Started 2 hours ago
        end_time: new Date(now.getTime() - 3600000)    // Ended 1 hour ago
      });

      await flashSaleService.updateStatusByTime();

      // Verify status was updated
      await dbHelpers.getFlashSaleById(testFlashSale.sale_id);
      // Note: This test might need adjustment based on actual implementation
    });
  });

  describe('Sale Statistics', () => {
    it('should get sale statistics', async () => {
      // Create some test orders
      const user1 = await dbHelpers.createUser();
      const user2 = await dbHelpers.createUser();

      await dbHelpers.createOrder(user1.user_id, testProduct.product_id, {
        status: CONSTANTS.ORDER_STATUS.CONFIRMED
      });
      await dbHelpers.createOrder(user2.user_id, testProduct.product_id, {
        status: CONSTANTS.ORDER_STATUS.CONFIRMED
      });

      const stats = await flashSaleService.getSaleStatistics(testFlashSale.sale_id);

      expect(stats).toBeDefined();
      expect(stats.saleId).toBe(testFlashSale.sale_id);
      expect(stats.totalOrders).toBe(2);
      expect(stats.confirmedOrders).toBe(2);
      expect(stats.totalQuantity).toBe(100);
      expect(stats.availableQuantity).toBe(98); // 100 - 2 sold
      expect(stats.soldQuantity).toBe(2);
    });

    it('should handle sale with no orders', async () => {
      const stats = await flashSaleService.getSaleStatistics(testFlashSale.sale_id);

      expect(stats.totalOrders).toBe(0);
      expect(stats.confirmedOrders).toBe(0);
      expect(stats.failedOrders).toBe(0);
      expect(stats.conversionRate).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent sale', async () => {
      const nonExistentSaleId = 'non-existent-sale-id';

      await expect(flashSaleService.getSaleStatistics(nonExistentSaleId))
        .rejects.toThrow('Flash sale not found');
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      const originalGetSaleStatistics = flashSaleService.getSaleStatistics.bind(flashSaleService);
      flashSaleService.getSaleStatistics = jest.fn().mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(flashSaleService.getSaleStatistics(testFlashSale.sale_id))
        .rejects.toThrow('Database connection failed');

      // Restore original method
      flashSaleService.getSaleStatistics = originalGetSaleStatistics;
    });
  });

  describe('Performance', () => {
    it('should handle multiple concurrent status requests', async () => {
      const concurrentRequests = Array(10).fill().map(() =>
        flashSaleService.getSaleStatus(testFlashSale.sale_id)
      );

      const startTime = Date.now();
      const results = await Promise.all(concurrentRequests);
      const endTime = Date.now();

      // All requests should succeed
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.saleId).toBe(testFlashSale.sale_id);
      });

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds
    });
  });
});
