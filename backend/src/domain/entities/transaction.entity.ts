export enum TransactionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DECLINED = 'DECLINED',
  VOIDED = 'VOIDED',
  ERROR = 'ERROR',
}

export class Transaction {
  constructor(
    public readonly id: string,
    public reference: string,
    public productId: string,
    public quantity: number,
    public amountInCents: number,
    public baseFeeInCents: number,
    public deliveryFeeInCents: number,
    public totalAmountInCents: number,
    public currency: string,
    public customerEmail: string,
    public customerName: string,
    public customerPhone: string,
    public deliveryAddress: string,
    public deliveryCity: string,
    public deliveryRegion: string,
    public deliveryCountry: string,
    public deliveryPostalCode: string,
    public status: TransactionStatus,
    public gatewayTransactionId: string | null,
    public gatewayStatus: string | null,
    public gatewayResponse: Record<string, unknown> | null,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {}

  markApproved(gatewayTransactionId: string, gatewayResponse: Record<string, unknown>): void {
    this.status = TransactionStatus.APPROVED;
    this.gatewayTransactionId = gatewayTransactionId;
    this.gatewayStatus = 'APPROVED';
    this.gatewayResponse = gatewayResponse;
    this.updatedAt = new Date();
  }

  markDeclined(gatewayTransactionId: string, gatewayResponse: Record<string, unknown>): void {
    this.status = TransactionStatus.DECLINED;
    this.gatewayTransactionId = gatewayTransactionId;
    this.gatewayStatus = 'DECLINED';
    this.gatewayResponse = gatewayResponse;
    this.updatedAt = new Date();
  }

  markError(reason: string): void {
    this.status = TransactionStatus.ERROR;
    this.gatewayStatus = reason;
    this.updatedAt = new Date();
  }

  isPending(): boolean {
    return this.status === TransactionStatus.PENDING;
  }
}
