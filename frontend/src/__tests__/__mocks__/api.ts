export const productsApi = {
  getAll: jest.fn(),
  getById: jest.fn(),
};

export const transactionsApi = {
  create: jest.fn(),
  pay: jest.fn(),
  getById: jest.fn(),
};

export default { get: jest.fn(), post: jest.fn() };
