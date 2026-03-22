export interface CardTokenRequest {
  number: string;
  cvc: string;
  expMonth: string;
  expYear: string;
  cardHolder: string;
}

export interface CardTokenResponse {
  token: string;
  brand: string;
  lastFour: string;
  expMonth: string;
  expYear: string;
}

export interface PaymentRequest {
  amountInCents: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  legalId: string;
  legalIdType: string;
  cardToken: string;
  installments: number;
  reference: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryRegion: string;
  deliveryCountry: string;
  deliveryPostalCode: string;
}

export interface PaymentResponse {
  gatewayTransactionId: string;
  status: 'APPROVED' | 'DECLINED' | 'PENDING' | 'VOIDED' | 'ERROR';
  statusMessage: string;
  rawResponse: Record<string, unknown>;
}

export interface PaymentGatewayPort {
  tokenizeCard(card: CardTokenRequest): Promise<CardTokenResponse>;
  getAcceptanceToken(): Promise<string>;
  processPayment(request: PaymentRequest, acceptanceToken: string): Promise<PaymentResponse>;
}

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');
