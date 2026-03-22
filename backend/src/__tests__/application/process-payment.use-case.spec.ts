import { ProcessPaymentUseCase } from '../../application/use-cases/process-payment.use-case';
import { Transaction, TransactionStatus } from '../../domain/entities/transaction.entity';

const makePendingTx = (): Transaction =>
  new Transaction(
    'tx-1', 'REF-001', 'prod-1', 1,
    100000, 30000, 50000, 180000, 'COP',
    'test@test.com', 'John', '+571234',
    'Calle 1', 'Bogotá', 'DC', 'CO', '110111',
    TransactionStatus.PENDING, null, null, null,
    new Date(), new Date(),
  );

const mockTransactionRepo = {
  create: jest.fn(),
  findById: jest.fn(),
  findByReference: jest.fn(),
  update: jest.fn(),
};

const mockProductRepo = {
  findAll: jest.fn(),
  findById: jest.fn(),
  updateStock: jest.fn(),
};

const mockPaymentGateway = {
  tokenizeCard: jest.fn(),
  getAcceptanceToken: jest.fn(),
  processPayment: jest.fn(),
};

const paymentInput = {
  transactionId: 'tx-1',
  cardNumber: '4111111111111111',
  cardCvc: '123',
  cardExpMonth: '08',
  cardExpYear: '28',
  cardHolder: 'JOHN DOE',
  installments: 1,
  legalId: '123456789',
  legalIdType: 'CC',
};

describe('ProcessPaymentUseCase', () => {
  let useCase: ProcessPaymentUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ProcessPaymentUseCase(
      mockTransactionRepo as any,
      mockProductRepo as any,
      mockPaymentGateway as any,
    );
  });

  it('returns err when transaction not found', async () => {
    mockTransactionRepo.findById.mockResolvedValue(null);
    const result = await useCase.execute(paymentInput);
    expect(result.success).toBe(false);
    expect((result as any).error).toContain('not found');
  });

  it('returns err when transaction is not pending', async () => {
    const tx = makePendingTx();
    tx.status = TransactionStatus.APPROVED;
    mockTransactionRepo.findById.mockResolvedValue(tx);
    const result = await useCase.execute(paymentInput);
    expect(result.success).toBe(false);
    expect((result as any).error).toContain('PENDING');
  });

  it('returns err when acceptance token fails', async () => {
    mockTransactionRepo.findById.mockResolvedValue(makePendingTx());
    mockPaymentGateway.getAcceptanceToken.mockRejectedValue(new Error('Network error'));
    const result = await useCase.execute(paymentInput);
    expect(result.success).toBe(false);
    expect((result as any).error).toContain('acceptance token');
  });

  it('processes approved payment and updates stock', async () => {
    const tx = makePendingTx();
    mockTransactionRepo.findById.mockResolvedValue(tx);
    mockPaymentGateway.getAcceptanceToken.mockResolvedValue('accept-tok');
    mockPaymentGateway.tokenizeCard.mockResolvedValue({ token: 'card-tok', brand: 'VISA', lastFour: '1111' });
    mockPaymentGateway.processPayment.mockResolvedValue({
      gatewayTransactionId: 'gw-999',
      status: 'APPROVED',
      statusMessage: 'Approved',
      rawResponse: {},
    });
    const updatedTx = { ...tx, status: TransactionStatus.APPROVED };
    mockTransactionRepo.update.mockResolvedValue(updatedTx);
    mockProductRepo.findById.mockResolvedValue({
      id: 'prod-1', stock: 5, decreaseStock: jest.fn(),
    });

    const result = await useCase.execute(paymentInput);
    expect(result.success).toBe(true);
    expect(mockProductRepo.updateStock).toHaveBeenCalled();
  });

  it('marks transaction declined on declined payment', async () => {
    const tx = makePendingTx();
    mockTransactionRepo.findById.mockResolvedValue(tx);
    mockPaymentGateway.getAcceptanceToken.mockResolvedValue('accept-tok');
    mockPaymentGateway.tokenizeCard.mockResolvedValue({ token: 'card-tok', brand: 'VISA', lastFour: '1111' });
    mockPaymentGateway.processPayment.mockResolvedValue({
      gatewayTransactionId: 'gw-000',
      status: 'DECLINED',
      statusMessage: 'Declined',
      rawResponse: {},
    });
    const declinedTx = { ...tx, status: TransactionStatus.DECLINED };
    mockTransactionRepo.update.mockResolvedValue(declinedTx);

    const result = await useCase.execute(paymentInput);
    expect(result.success).toBe(true);
    expect(mockProductRepo.updateStock).not.toHaveBeenCalled();
  });
});
