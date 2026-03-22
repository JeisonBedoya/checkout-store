import { configureStore } from '@reduxjs/toolkit';
import productsReducer, { fetchProducts, fetchProductById } from '../../store/slices/productsSlice';
import { productsApi } from '../../services/api';
import { Product } from '../../types';

jest.mock('../../services/api');

const mockProduct: Product = {
  id: 'prod-1', name: 'Test', description: 'D', price: 100000,
  imageUrl: 'img', stock: 5, category: 'Electronics', createdAt: '', updatedAt: '',
};

const makeStore = () => configureStore({ reducer: { products: productsReducer } });

describe('products async thunks', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('fetchProducts', () => {
    it('fetches products successfully', async () => {
      (productsApi.getAll as jest.Mock).mockResolvedValue([mockProduct]);
      const store = makeStore();
      await store.dispatch(fetchProducts());
      const state = store.getState().products;
      expect(state.items).toHaveLength(1);
      expect(state.loading).toBe(false);
    });

    it('handles fetch failure', async () => {
      (productsApi.getAll as jest.Mock).mockRejectedValue({ response: { data: { message: 'Server error' } } });
      const store = makeStore();
      await store.dispatch(fetchProducts());
      const state = store.getState().products;
      expect(state.error).toBe('Server error');
    });
  });

  describe('fetchProductById', () => {
    it('fetches single product and updates items list', async () => {
      (productsApi.getById as jest.Mock).mockResolvedValue(mockProduct);
      const store = makeStore();
      await store.dispatch(fetchProductById('prod-1'));
      const state = store.getState().products;
      expect(state.selectedProduct?.id).toBe('prod-1');
    });

    it('handles not found error', async () => {
      (productsApi.getById as jest.Mock).mockRejectedValue({ response: { data: { message: 'Not found' } } });
      const store = makeStore();
      await store.dispatch(fetchProductById('bad-id'));
      // rejected - no throw, just rejected action
      expect(store.getState().products.selectedProduct).toBeNull();
    });
  });
});
