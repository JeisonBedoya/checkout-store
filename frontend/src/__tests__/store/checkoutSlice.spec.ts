import checkoutReducer, {
  openCheckout,
  closeCheckout,
  setCardInfo,
  setDeliveryInfo,
  goToSummary,
  goBackToCardForm,
  clearCheckout,
  clearError,
  createTransaction,
  processPayment,
} from '../../store/slices/checkoutSlice';
import { Product, CardInfo, DeliveryInfo } from '../../types';

const mockProduct: Product = {
  id: 'prod-1',
  name: 'Test',
  description: 'D',
  price: 100000,
  imageUrl: 'img',
  stock: 5,
  category: 'Electronics',
  createdAt: '',
  updatedAt: '',
};

const mockCard: CardInfo = {
  number: '4111 1111 1111 1111',
  holder: 'JOHN DOE',
  expMonth: '08',
  expYear: '28',
  cvc: '123',
  brand: 'visa',
};

const mockDelivery: DeliveryInfo = {
  email: 'test@test.com',
  name: 'John',
  phone: '+57300',
  address: 'Calle 1',
  city: 'Bogotá',
  region: 'DC',
  country: 'CO',
  postalCode: '110111',
  legalId: '123',
  legalIdType: 'CC',
};

describe('checkoutSlice', () => {
  const initialState = {
    step: 'idle' as const,
    selectedProduct: null,
    quantity: 1,
    cardInfo: null,
    deliveryInfo: null,
    pendingTransaction: null,
    completedTransaction: null,
    loading: false,
    error: null,
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it('returns initial state', () => {
    const state = checkoutReducer(undefined, { type: 'unknown' });
    expect(state.step).toBe('idle');
  });

  it('openCheckout sets product and step', () => {
    const state = checkoutReducer(initialState, openCheckout({ product: mockProduct, quantity: 2 }));
    expect(state.step).toBe('card-form');
    expect(state.selectedProduct?.id).toBe('prod-1');
    expect(state.quantity).toBe(2);
  });

  it('closeCheckout resets step and clears transient state', () => {
    const withProduct = { ...initialState, step: 'card-form' as const, selectedProduct: mockProduct, cardInfo: mockCard };
    const state = checkoutReducer(withProduct, closeCheckout());
    expect(state.step).toBe('idle');
    expect(state.cardInfo).toBeNull();
    expect(state.error).toBeNull();
  });

  it('setCardInfo stores card info', () => {
    const state = checkoutReducer(initialState, setCardInfo(mockCard));
    expect(state.cardInfo?.brand).toBe('visa');
  });

  it('setDeliveryInfo stores delivery info', () => {
    const state = checkoutReducer(initialState, setDeliveryInfo(mockDelivery));
    expect(state.deliveryInfo?.email).toBe('test@test.com');
  });

  it('goToSummary changes step', () => {
    const state = checkoutReducer({ ...initialState, step: 'card-form' }, goToSummary());
    expect(state.step).toBe('summary');
  });

  it('goBackToCardForm changes step', () => {
    const state = checkoutReducer({ ...initialState, step: 'summary' as any }, goBackToCardForm());
    expect(state.step).toBe('card-form');
  });

  it('clearCheckout resets all state', () => {
    const withData = { ...initialState, step: 'result' as any, selectedProduct: mockProduct, cardInfo: mockCard };
    const state = checkoutReducer(withData, clearCheckout());
    expect(state.step).toBe('idle');
    expect(state.selectedProduct).toBeNull();
    expect(state.cardInfo).toBeNull();
  });

  it('clearError sets error to null', () => {
    const withError = { ...initialState, error: 'some error' };
    const state = checkoutReducer(withError, clearError());
    expect(state.error).toBeNull();
  });

  it('sets loading on createTransaction pending', () => {
    const state = checkoutReducer(initialState, { type: createTransaction.pending.type });
    expect(state.loading).toBe(true);
  });

  it('sets pending transaction on createTransaction fulfilled', () => {
    const tx = { id: 'tx-1', reference: 'REF', status: 'PENDING' } as any;
    const state = checkoutReducer(initialState, { type: createTransaction.fulfilled.type, payload: tx });
    expect(state.loading).toBe(false);
    expect(state.pendingTransaction?.id).toBe('tx-1');
    expect(state.step).toBe('summary');
  });

  it('sets error on createTransaction rejected', () => {
    const state = checkoutReducer(initialState, {
      type: createTransaction.rejected.type,
      payload: 'Create failed',
    });
    expect(state.error).toBe('Create failed');
  });

  it('sets processing step on processPayment pending', () => {
    const state = checkoutReducer(initialState, { type: processPayment.pending.type });
    expect(state.step).toBe('processing');
    expect(state.loading).toBe(true);
  });

  it('sets completed transaction on processPayment fulfilled', () => {
    const tx = { id: 'tx-2', status: 'APPROVED' } as any;
    const state = checkoutReducer(initialState, { type: processPayment.fulfilled.type, payload: tx });
    expect(state.completedTransaction?.id).toBe('tx-2');
    expect(state.step).toBe('result');
  });
});
