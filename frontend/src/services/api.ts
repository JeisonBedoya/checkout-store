import axios from 'axios';
import { Product, Transaction } from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  headers: { 'Content-Type': 'application/json' },
});

export interface CreateTransactionPayload {
  productId: string;
  quantity: number;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryRegion: string;
  deliveryCountry: string;
  deliveryPostalCode: string;
}

export interface ProcessPaymentPayload {
  cardNumber: string;
  cardCvc: string;
  cardExpMonth: string;
  cardExpYear: string;
  cardHolder: string;
  installments: number;
  legalId: string;
  legalIdType: string;
}

export const productsApi = {
  getAll: async (): Promise<Product[]> => {
    const res = await api.get<{ data: Product[] }>('/products');
    return res.data.data;
  },
  getById: async (id: string): Promise<Product> => {
    const res = await api.get<{ data: Product }>(`/products/${id}`);
    return res.data.data;
  },
};

export const transactionsApi = {
  create: async (payload: CreateTransactionPayload): Promise<Transaction> => {
    const res = await api.post<{ data: Transaction }>('/transactions', payload);
    return res.data.data;
  },
  pay: async (transactionId: string, payload: ProcessPaymentPayload): Promise<Transaction> => {
    const res = await api.post<{ data: Transaction }>(`/transactions/${transactionId}/pay`, payload);
    return res.data.data;
  },
  getById: async (id: string): Promise<Transaction> => {
    const res = await api.get<{ data: Transaction }>(`/transactions/${id}`);
    return res.data.data;
  },
};

export default api;
