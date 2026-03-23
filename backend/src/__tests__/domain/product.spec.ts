import { Product } from '../../domain/entities/product.entity';

const makeProduct = (stock: number) =>
  new Product('id-1', 'Test', 'Desc', 100000, 'img.jpg', stock, 'Electronics', new Date(), new Date());

describe('Product entity', () => {
  describe('hasStock', () => {
    it('returns true when stock >= quantity', () => {
      expect(makeProduct(5).hasStock(3)).toBe(true);
    });
    it('returns false when stock < quantity', () => {
      expect(makeProduct(2).hasStock(3)).toBe(false);
    });
    it('defaults to quantity 1', () => {
      expect(makeProduct(1).hasStock()).toBe(true);
      expect(makeProduct(0).hasStock()).toBe(false);
    });
  });

  describe('decreaseStock', () => {
    it('decreases stock by quantity', () => {
      const p = makeProduct(5);
      p.decreaseStock(2);
      expect(p.stock).toBe(3);
    });
    it('throws when insufficient stock', () => {
      const p = makeProduct(1);
      expect(() => p.decreaseStock(2)).toThrow('Insufficient stock');
    });
  });
});
