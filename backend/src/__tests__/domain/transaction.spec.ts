import { Transaction, TransactionStatus } from '../../domain/entities/transaction.entity';

const makeTx = () =>
  new Transaction(
    'tx-1', 'REF-001', 'prod-1', 1,
    100000, 30000, 50000, 180000, 'COP',
    'test@test.com', 'John', '+571234567',
    'Calle 1', 'Bogotá', 'DC', 'CO', '110111',
    TransactionStatus.PENDING, null, null, null,
    new Date(), new Date(),
  );

describe('Transaction entity', () => {
  it('creates with PENDING status', () => {
    expect(makeTx().status).toBe(TransactionStatus.PENDING);
    expect(makeTx().isPending()).toBe(true);
  });

  it('markApproved sets APPROVED status', () => {
    const tx = makeTx();
    tx.markApproved('gw-123', { status: 'APPROVED' });
    expect(tx.status).toBe(TransactionStatus.APPROVED);
    expect(tx.gatewayTransactionId).toBe('gw-123');
    expect(tx.isPending()).toBe(false);
  });

  it('markDeclined sets DECLINED status', () => {
    const tx = makeTx();
    tx.markDeclined('gw-456', { status: 'DECLINED' });
    expect(tx.status).toBe(TransactionStatus.DECLINED);
  });

  it('markError sets ERROR status', () => {
    const tx = makeTx();
    tx.markError('card failure');
    expect(tx.status).toBe(TransactionStatus.ERROR);
    expect(tx.gatewayStatus).toBe('card failure');
  });
});
