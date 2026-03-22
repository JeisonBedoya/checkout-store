export interface Product {
  id: string;
  name: string;
  description: string;
  price: number; // in cents
  imageUrl: string;
  stock: number;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export type TransactionStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR';

export interface Transaction {
  id: string;
  reference: string;
  productId: string;
  quantity: number;
  amountInCents: number;
  baseFeeInCents: number;
  deliveryFeeInCents: number;
  totalAmountInCents: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryRegion: string;
  deliveryCountry: string;
  deliveryPostalCode: string;
  status: TransactionStatus;
  gatewayTransactionId: string | null;
  gatewayStatus: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CardBrand = 'visa' | 'mastercard' | 'unknown';

export interface CardInfo {
  number: string;
  holder: string;
  expMonth: string;
  expYear: string;
  cvc: string;
  brand: CardBrand;
}

export interface DeliveryInfo {
  address: string;
  city: string;
  region: string;
  country: string;
  postalCode: string;
  email: string;
  name: string;
  phone: string;
  legalId: string;
  legalIdType: string;
}

export const BASE_FEE_IN_CENTS = 300000;
export const DELIVERY_FEE_IN_CENTS = 500000;
