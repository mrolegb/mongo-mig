// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.+(ts|tsx|js)', '**/?(*.)+(spec|test).+(ts|tsx|js)'],
//   collectCoverage: true,
//   collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
};