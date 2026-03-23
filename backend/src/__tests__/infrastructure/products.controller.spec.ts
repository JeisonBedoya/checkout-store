import { ProductsController } from '../../infrastructure/http/controllers/products.controller';
import { GetProductsUseCase } from '../../application/use-cases/get-products.use-case';
import { HttpException } from '@nestjs/common';
import { Product } from '../../domain/entities/product.entity';

const mockProduct = new Product('id-1', 'Test', 'Desc', 100000, 'img.jpg', 5, 'Electronics', new Date(), new Date());
const mockGetProductsUseCase = {
  execute: jest.fn(),
  executeById: jest.fn(),
};

describe('ProductsController', () => {
  let controller: ProductsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ProductsController(mockGetProductsUseCase as unknown as GetProductsUseCase);
  });

  describe('findAll', () => {
    it('returns products list', async () => {
      mockGetProductsUseCase.execute.mockResolvedValue({ success: true, value: [mockProduct] });
      const result = await controller.findAll();
      expect(result).toEqual({ data: [mockProduct] });
    });

    it('throws HttpException on failure', async () => {
      mockGetProductsUseCase.execute.mockResolvedValue({ success: false, error: 'DB error' });
      await expect(controller.findAll()).rejects.toBeInstanceOf(HttpException);
    });
  });

  describe('findOne', () => {
    it('returns single product', async () => {
      mockGetProductsUseCase.executeById.mockResolvedValue({ success: true, value: mockProduct });
      const result = await controller.findOne('id-1');
      expect(result).toEqual({ data: mockProduct });
    });

    it('throws 404 when not found', async () => {
      mockGetProductsUseCase.executeById.mockResolvedValue({ success: false, error: 'Not found' });
      await expect(controller.findOne('bad-id')).rejects.toBeInstanceOf(HttpException);
    });
  });
});
