import { TransactionsController } from '../../infrastructure/http/controllers/transactions.controller';
import { CreateTransactionUseCase } from '../../application/use-cases/create-transaction.use-case';
import { ProcessPaymentUseCase } from '../../application/use-cases/process-payment.use-case';
import { HttpException } from '@nestjs/common';
import { Transaction, TransactionStatus } from '../../domain/entities/transaction.entity';

const makeTx = (status = TransactionStatus.PENDING): Transaction =>
  new Transaction(
    'tx-1', 'REF-001', 'prod-1', 1,
    100000, 30000, 50000, 180000, 'COP',
    'test@test.com', 'John', '+571234',
    'Calle 1', 'Bogotá', 'DC', 'CO', '110111',
    status, null, null, null, new Date(), new Date(),
  );

const mockCreateTx = { execute: jest.fn() };
const mockProcessPayment = { execute: jest.fn() };
const mockTxRepo = { findById: jest.fn(), create: jest.fn(), findByReference: jest.fn(), update: jest.fn() };

describe('TransactionsController', () => {
  let controller: TransactionsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new TransactionsController(
      mockCreateTx as unknown as CreateTransactionUseCase,
      mockProcessPayment as unknown as ProcessPaymentUseCase,
      mockTxRepo as any,
    );
  });

  describe('create', () => {
    const dto = {
      productId: 'prod-1', quantity: 1, customerEmail: 'test@test.com',
      customerName: 'John', customerPhone: '+57300',
      deliveryAddress: 'Calle 1', deliveryCity: 'Bogotá',
      deliveryRegion: 'DC', deliveryCountry: 'CO', deliveryPostalCode: '110111',
    };

    it('returns created transaction', async () => {
      const tx = makeTx();
      mockCreateTx.execute.mockResolvedValue({ success: true, value: tx });
      const result = await controller.create(dto as any);
      expect(result).toEqual({ data: tx });
    });

    it('throws HttpException on failure', async () => {
      mockCreateTx.execute.mockResolvedValue({ success: false, error: 'Insufficient stock' });
      await expect(controller.create(dto as any)).rejects.toBeInstanceOf(HttpException);
    });
  });

  describe('pay', () => {
    const dto = {
      cardNumber: '4111111111111111', cardCvc: '123', cardExpMonth: '08',
      cardExpYear: '28', cardHolder: 'JOHN', installments: 1, legalId: '123', legalIdType: 'CC',
    };

    it('returns paid transaction', async () => {
      const tx = makeTx(TransactionStatus.APPROVED);
      mockProcessPayment.execute.mockResolvedValue({ success: true, value: tx });
      const result = await controller.pay('tx-1', dto as any);
      expect(result).toEqual({ data: tx });
    });

    it('throws HttpException on failure', async () => {
      mockProcessPayment.execute.mockResolvedValue({ success: false, error: 'Card declined' });
      await expect(controller.pay('tx-1', dto as any)).rejects.toBeInstanceOf(HttpException);
    });
  });

  describe('findOne', () => {
    it('returns transaction', async () => {
      const tx = makeTx();
      mockTxRepo.findById.mockResolvedValue(tx);
      const result = await controller.findOne('tx-1');
      expect(result).toEqual({ data: tx });
    });

    it('throws 404 when not found', async () => {
      mockTxRepo.findById.mockResolvedValue(null);
      await expect(controller.findOne('bad-id')).rejects.toBeInstanceOf(HttpException);
    });
  });
});
