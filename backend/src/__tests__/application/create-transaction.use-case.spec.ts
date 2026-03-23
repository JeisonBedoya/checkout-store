import { CreateTransactionUseCase, BASE_FEE_IN_CENTS, DELIVERY_FEE_IN_CENTS } from '../../application/use-cases/create-transaction.use-case';
import { Product } from '../../domain/entities/product.entity';
import { Transaction, TransactionStatus } from '../../domain/entities/transaction.entity';

const mockProduct = new Product('prod-1', 'Item', 'Desc', 100000, 'img.jpg', 5, 'Cat', new Date(), new Date());

const mockProductRepo = {
  findAll: jest.fn(),
  findById: jest.fn(),
  updateStock: jest.fn(),
};

const mockTransactionRepo = {
  create: jest.fn(),
  findById: jest.fn(),
  findByReference: jest.fn(),
  update: jest.fn(),
};

const input = {
  productId: 'prod-1',
  quantity: 1,
  customerEmail: 'test@test.com',
  customerName: 'John',
  customerPhone: '+57300',
  deliveryAddress: 'Calle 1',
  deliveryCity: 'Bogotá',
  deliveryRegion: 'DC',
  deliveryCountry: 'CO',
  deliveryPostalCode: '110111',
};

describe('CreateTransactionUseCase', () => {
  let useCase: CreateTransactionUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateTransactionUseCase(mockProductRepo as any, mockTransactionRepo as any);
  });

  it('returns err when product not found', async () => {
    mockProductRepo.findById.mockResolvedValue(null);
    const result = await useCase.execute(input);
    expect(result.success).toBe(false);
    expect((result as any).error).toContain('not found');
  });

  it('returns err when insufficient stock', async () => {
    mockProductRepo.findById.mockResolvedValue(
      new Product('prod-1', 'Item', 'Desc', 100000, 'img.jpg', 0, 'Cat', new Date(), new Date()),
    );
    const result = await useCase.execute({ ...input, quantity: 1 });
    expect(result.success).toBe(false);
    expect((result as any).error).toContain('Insufficient stock');
  });

  it('creates transaction with correct total', async () => {
    mockProductRepo.findById.mockResolvedValue(mockProduct);
    const mockTx = { id: 'tx-1', reference: 'TXN-abc', status: TransactionStatus.PENDING } as Transaction;
    mockTransactionRepo.create.mockResolvedValue(mockTx);

    const result = await useCase.execute(input);
    expect(result.success).toBe(true);

    const createCall = mockTransactionRepo.create.mock.calls[0][0];
    expect(createCall.amountInCents).toBe(100000);
    expect(createCall.baseFeeInCents).toBe(BASE_FEE_IN_CENTS);
    expect(createCall.deliveryFeeInCents).toBe(DELIVERY_FEE_IN_CENTS);
    expect(createCall.totalAmountInCents).toBe(100000 + BASE_FEE_IN_CENTS + DELIVERY_FEE_IN_CENTS);
    expect(createCall.status).toBe(TransactionStatus.PENDING);
  });

  it('returns err on repository create failure', async () => {
    mockProductRepo.findById.mockResolvedValue(mockProduct);
    mockTransactionRepo.create.mockRejectedValue(new Error('DB error'));
    const result = await useCase.execute(input);
    expect(result.success).toBe(false);
  });
});
