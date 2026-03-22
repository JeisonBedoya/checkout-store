import { GetProductsUseCase } from '../../application/use-cases/get-products.use-case';
import { Product } from '../../domain/entities/product.entity';

const mockProduct = new Product('id-1', 'Test', 'Desc', 100000, 'img.jpg', 5, 'Electronics', new Date(), new Date());

const mockRepo = {
  findAll: jest.fn(),
  findById: jest.fn(),
  updateStock: jest.fn(),
};

describe('GetProductsUseCase', () => {
  let useCase: GetProductsUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetProductsUseCase(mockRepo as any);
  });

  describe('execute', () => {
    it('returns ok with products list', async () => {
      mockRepo.findAll.mockResolvedValue([mockProduct]);
      const result = await useCase.execute();
      expect(result.success).toBe(true);
      expect((result as any).value).toHaveLength(1);
    });

    it('returns err on repository failure', async () => {
      mockRepo.findAll.mockRejectedValue(new Error('DB error'));
      const result = await useCase.execute();
      expect(result.success).toBe(false);
      expect((result as any).error).toContain('DB error');
    });
  });

  describe('executeById', () => {
    it('returns ok with product when found', async () => {
      mockRepo.findById.mockResolvedValue(mockProduct);
      const result = await useCase.executeById('id-1');
      expect(result.success).toBe(true);
      expect((result as any).value.id).toBe('id-1');
    });

    it('returns err when product not found', async () => {
      mockRepo.findById.mockResolvedValue(null);
      const result = await useCase.executeById('unknown');
      expect(result.success).toBe(false);
      expect((result as any).error).toContain('not found');
    });
  });
});
