import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Transaction, CardInfo, DeliveryInfo, Product } from '../../types';
import { transactionsApi } from '../../services/api';

type CheckoutStep = 'idle' | 'card-form' | 'summary' | 'processing' | 'result';

interface CheckoutState {
  step: CheckoutStep;
  selectedProduct: Product | null;
  quantity: number;
  cardInfo: CardInfo | null;
  deliveryInfo: DeliveryInfo | null;
  pendingTransaction: Transaction | null;
  completedTransaction: Transaction | null;
  loading: boolean;
  error: string | null;
}

const STORAGE_KEY = 'checkout_transaction';

const loadFromStorage = (): Partial<CheckoutState> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const saveToStorage = (transaction: Transaction | null) => {
  if (transaction) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ completedTransaction: transaction }));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
};

const storedState = loadFromStorage();

const initialState: CheckoutState = {
  step: 'idle',
  selectedProduct: null,
  quantity: 1,
  cardInfo: null,
  deliveryInfo: null,
  pendingTransaction: null,
  completedTransaction: storedState.completedTransaction ?? null,
  loading: false,
  error: null,
};

export const createTransaction = createAsyncThunk(
  'checkout/createTransaction',
  async (_, { getState, rejectWithValue }) => {
    const { checkout } = getState() as { checkout: CheckoutState };
    if (!checkout.selectedProduct || !checkout.deliveryInfo) {
      return rejectWithValue('Missing product or delivery info');
    }
    try {
      return await transactionsApi.create({
        productId: checkout.selectedProduct.id,
        quantity: checkout.quantity,
        customerEmail: checkout.deliveryInfo.email,
        customerName: checkout.deliveryInfo.name,
        customerPhone: checkout.deliveryInfo.phone,
        deliveryAddress: checkout.deliveryInfo.address,
        deliveryCity: checkout.deliveryInfo.city,
        deliveryRegion: checkout.deliveryInfo.region,
        deliveryCountry: checkout.deliveryInfo.country,
        deliveryPostalCode: checkout.deliveryInfo.postalCode,
      });
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create transaction');
    }
  },
);

export const processPayment = createAsyncThunk(
  'checkout/processPayment',
  async (_, { getState, rejectWithValue }) => {
    const { checkout } = getState() as { checkout: CheckoutState };
    if (!checkout.pendingTransaction || !checkout.cardInfo) {
      return rejectWithValue('Missing transaction or card info');
    }
    try {
      const expYear = checkout.cardInfo.expYear.length === 2
        ? checkout.cardInfo.expYear
        : checkout.cardInfo.expYear.slice(-2);

      return await transactionsApi.pay(checkout.pendingTransaction.id, {
        cardNumber: checkout.cardInfo.number.replace(/\s/g, ''),
        cardCvc: checkout.cardInfo.cvc,
        cardExpMonth: checkout.cardInfo.expMonth,
        cardExpYear: expYear,
        cardHolder: checkout.cardInfo.holder,
        installments: 1,
        legalId: '1234567890',
        legalIdType: 'CC',
      });
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Payment failed');
    }
  },
);

const checkoutSlice = createSlice({
  name: 'checkout',
  initialState,
  reducers: {
    openCheckout(state, action: PayloadAction<{ product: Product; quantity: number }>) {
      state.selectedProduct = action.payload.product;
      state.quantity = action.payload.quantity;
      state.step = 'card-form';
      state.error = null;
    },
    closeCheckout(state) {
      state.step = 'idle';
      state.cardInfo = null;
      state.deliveryInfo = null;
      state.pendingTransaction = null;
      state.error = null;
    },
    setCardInfo(state, action: PayloadAction<CardInfo>) {
      state.cardInfo = action.payload;
    },
    setDeliveryInfo(state, action: PayloadAction<DeliveryInfo>) {
      state.deliveryInfo = action.payload;
    },
    goToSummary(state) {
      state.step = 'summary';
    },
    goBackToCardForm(state) {
      state.step = 'card-form';
    },
    clearCheckout(state) {
      state.step = 'idle';
      state.selectedProduct = null;
      state.quantity = 1;
      state.cardInfo = null;
      state.deliveryInfo = null;
      state.pendingTransaction = null;
      state.completedTransaction = null;
      state.error = null;
      saveToStorage(null);
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // createTransaction
      .addCase(createTransaction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTransaction.fulfilled, (state, action) => {
        state.loading = false;
        state.pendingTransaction = action.payload;
        state.step = 'summary';
      })
      .addCase(createTransaction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // processPayment
      .addCase(processPayment.pending, (state) => {
        state.loading = true;
        state.step = 'processing';
        state.error = null;
      })
      .addCase(processPayment.fulfilled, (state, action) => {
        state.loading = false;
        state.completedTransaction = action.payload;
        state.step = 'result';
        saveToStorage(action.payload);
      })
      .addCase(processPayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.step = 'result';
      });
  },
});

export const {
  openCheckout,
  closeCheckout,
  setCardInfo,
  setDeliveryInfo,
  goToSummary,
  goBackToCardForm,
  clearCheckout,
  clearError,
} = checkoutSlice.actions;
export default checkoutSlice.reducer;
