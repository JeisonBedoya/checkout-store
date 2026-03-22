import productsReducer, {
  selectProduct,
  updateProductStock,
  clearError,
  fetchProducts,
} from '../../store/slices/productsSlice';
import { Product } from '../../types';

const mockProduct: Product = {
  id: 'prod-1',
  name: 'Test Product',
  description: 'Desc',
  price: 100000,
  imageUrl: 'img.jpg',
  stock: 5,
  category: 'Electronics',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

describe('productsSlice', () => {
  const initialState = {
    items: [],
    selectedProduct: null,
    loading: false,
    error: null,
  };

  it('returns initial state', () => {
    expect(productsReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('selectProduct sets selectedProduct', () => {
    const state = productsReducer(initialState, selectProduct(mockProduct));
    expect(state.selectedProduct).toEqual(mockProduct);
  });

  it('updateProductStock updates stock', () => {
    const withProduct = { ...initialState, items: [mockProduct] };
    const state = productsReducer(withProduct, updateProductStock({ productId: 'prod-1', newStock: 3 }));
    expect(state.items[0].stock).toBe(3);
  });

  it('updateProductStock does nothing for unknown product', () => {
    const withProduct = { ...initialState, items: [mockProduct] };
    const state = productsReducer(withProduct, updateProductStock({ productId: 'unknown', newStock: 0 }));
    expect(state.items[0].stock).toBe(5);
  });

  it('clearError sets error to null', () => {
    const withError = { ...initialState, error: 'Some error' };
    const state = productsReducer(withError, clearError());
    expect(state.error).toBeNull();
  });

  it('sets loading on fetchProducts pending', () => {
    const state = productsReducer(initialState, { type: fetchProducts.pending.type });
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('sets items on fetchProducts fulfilled', () => {
    const state = productsReducer(initialState, {
      type: fetchProducts.fulfilled.type,
      payload: [mockProduct],
    });
    expect(state.loading).toBe(false);
    expect(state.items).toHaveLength(1);
  });

  it('sets error on fetchProducts rejected', () => {
    const state = productsReducer(initialState, {
      type: fetchProducts.rejected.type,
      payload: 'Load failed',
    });
    expect(state.loading).toBe(false);
    expect(state.error).toBe('Load failed');
  });
});
