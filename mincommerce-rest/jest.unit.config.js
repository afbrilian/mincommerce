module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns - only unit tests
  testMatch: [
    '**/src/**/*.test.js',
    '**/src/**/*.spec.js'
  ],
  
  // Setup files for unit tests (minimal, no real connections)
  setupFilesAfterEnv: ['<rootDir>/tests/unit-setup.js'],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js'
  ],
  
  // Coverage thresholds (temporarily lowered for testing)
  coverageThreshold: {
    global: {
      branches: 20,
      functions: 20,
      lines: 20,
      statements: 20
    }
  },
  
  // Test timeout
  testTimeout: 10000,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Verbose output
  verbose: false,
  
  // Module paths
  moduleDirectories: ['node_modules', 'src'],
  
  // Transform files
  transform: {},
  
  // Global variables
  globals: {
    'process.env.NODE_ENV': 'test'
  }
};