import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { Product } from '../../types';
import { productsApi } from '../../services/api';

interface ProductsState {
  items: Product[];
  selectedProduct: Product | null;
  loading: boolean;
  error: string | null;
}

const initialState: ProductsState = {
  items: [],
  selectedProduct: null,
  loading: false,
  error: null,
};

export const fetchProducts = createAsyncThunk('products/fetchAll', async (_, { rejectWithValue }) => {
  try {
    return await productsApi.getAll();
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message || 'Failed to load products');
  }
});

export const fetchProductById = createAsyncThunk(
  'products/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      return await productsApi.getById(id);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load product');
    }
  },
);

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    selectProduct(state, action) {
      state.selectedProduct = action.payload;
    },
    updateProductStock(state, action) {
      const { productId, newStock } = action.payload;
      const product = state.items.find((p) => p.id === productId);
      if (product) product.stock = newStock;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        state.selectedProduct = action.payload;
        const idx = state.items.findIndex((p) => p.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      });
  },
});

export const { selectProduct, updateProductStock, clearError } = productsSlice.actions;
export default productsSlice.reducer;
