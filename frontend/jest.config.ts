import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg|ico)$': '<rootDir>/src/__tests__/__mocks__/fileMock.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^../../services/api$': '<rootDir>/src/__tests__/__mocks__/api.ts',
    '^../services/api$': '<rootDir>/src/__tests__/__mocks__/api.ts',
    '^./services/api$': '<rootDir>/src/__tests__/__mocks__/api.ts',
  },
  globals: {
    'ts-jest': {
      diagnostics: false,
    },
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        types: ['jest', 'node'],
        moduleResolution: 'node',
        module: 'commonjs',
        strict: false,
      },
      useESM: false,
    }],
  },
  testMatch: ['**/__tests__/**/*.spec.{ts,tsx}'],
  collectCoverageFrom: [
    'src/utils/**/*.{ts,tsx}',
    'src/store/slices/**/*.{ts,tsx}',
  ],
  coverageThreshold: {
    global: { lines: 80, functions: 80, branches: 60, statements: 80 },
  },
};

export default config;
