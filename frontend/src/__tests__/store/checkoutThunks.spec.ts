import { configureStore } from '@reduxjs/toolkit';
import checkoutReducer, { openCheckout, createTransaction, processPayment } from '../../store/slices/checkoutSlice';
import productsReducer from '../../store/slices/productsSlice';
import { transactionsApi } from '../../services/api';
import { Product, CardInfo, DeliveryInfo } from '../../types';

jest.mock('../../services/api');

const mockProduct: Product = {
  id: 'prod-1', name: 'Test', description: 'D', price: 100000,
  imageUrl: 'img', stock: 5, category: 'Electronics', createdAt: '', updatedAt: '',
};

const mockCard: CardInfo = {
  number: '4111 1111 1111 1111', holder: 'JOHN', expMonth: '08', expYear: '28', cvc: '123', brand: 'visa',
};

const mockDelivery: DeliveryInfo = {
  email: 'a@b.com', name: 'John', phone: '+57', address: 'Calle 1', city: 'Bogotá',
  region: 'DC', country: 'CO', postalCode: '110111', legalId: '123', legalIdType: 'CC',
};

const makeStore = () =>
  configureStore({ reducer: { checkout: checkoutReducer, products: productsReducer } });

describe('checkout async thunks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('createTransaction', () => {
    it('creates transaction successfully', async () => {
      const tx = { id: 'tx-1', reference: 'REF', status: 'PENDING' };
      (transactionsApi.create as jest.Mock).mockResolvedValue(tx);
      const store = makeStore();
      store.dispatch(openCheckout({ product: mockProduct, quantity: 1 }));
      store.dispatch({ type: 'checkout/setCardInfo', payload: mockCard });
      store.dispatch({ type: 'checkout/setDeliveryInfo', payload: mockDelivery });
      await store.dispatch(createTransaction());
      const state = store.getState().checkout;
      expect(state.pendingTransaction?.id).toBe('tx-1');
      expect(state.step).toBe('summary');
    });

    it('handles missing product/delivery', async () => {
      const store = makeStore();
      await store.dispatch(createTransaction());
      const state = store.getState().checkout;
      expect(state.error).toContain('Missing');
    });

    it('handles API error', async () => {
      (transactionsApi.create as jest.Mock).mockRejectedValue({
        response: { data: { message: 'Out of stock' } }
      });
      const store = makeStore();
      store.dispatch(openCheckout({ product: mockProduct, quantity: 1 }));
      store.dispatch({ type: 'checkout/setDeliveryInfo', payload: mockDelivery });
      await store.dispatch(createTransaction());
      const state = store.getState().checkout;
      expect(state.error).toBeTruthy();
    });
  });

  describe('processPayment', () => {
    it('processes payment successfully', async () => {
      const tx = { id: 'tx-2', productId: 'prod-1', totalAmountInCents: 180000, status: 'APPROVED' };
      (transactionsApi.pay as jest.Mock).mockResolvedValue(tx);
      const store = makeStore();
      store.dispatch({ type: 'checkout/setCardInfo', payload: mockCard });
      store.dispatch({
        type: 'checkout/createTransaction/fulfilled',
        payload: { id: 'tx-1' }
      });
      await store.dispatch(processPayment());
      const state = store.getState().checkout;
      expect(state.completedTransaction?.id).toBe('tx-2');
      expect(state.step).toBe('result');
    });

    it('handles missing transaction or card', async () => {
      const store = makeStore();
      await store.dispatch(processPayment());
      const state = store.getState().checkout;
      expect(state.error).toContain('Missing');
    });

    it('handles payment API error', async () => {
      (transactionsApi.pay as jest.Mock).mockRejectedValue({
        response: { data: { message: 'Declined' } }
      });
      const store = makeStore();
      store.dispatch({ type: 'checkout/setCardInfo', payload: mockCard });
      store.dispatch({
        type: 'checkout/createTransaction/fulfilled',
        payload: { id: 'tx-1' }
      });
      await store.dispatch(processPayment());
      const state = store.getState().checkout;
      expect(state.error).toBeTruthy();
      expect(state.step).toBe('result');
    });
  });
});
