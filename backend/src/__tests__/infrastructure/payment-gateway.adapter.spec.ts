import { PaymentGatewayAdapter } from '../../infrastructure/payment-gateway/payment-gateway.adapter';
import { createHash } from 'crypto';

const mockHttpService = {
  get: jest.fn(),
  post: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string, def?: any) => {
    const config: Record<string, string> = {
      PAYMENT_GATEWAY_URL: 'https://api-sandbox.test/v1',
      PAYMENT_PUBLIC_KEY: 'pub_test_key',
      PAYMENT_PRIVATE_KEY: 'prv_test_key',
      PAYMENT_INTEGRITY_KEY: 'integrity_test_key',
    };
    return config[key] ?? def;
  }),
};

// Mock rxjs firstValueFrom
jest.mock('rxjs', () => ({
  firstValueFrom: jest.fn((obs) => Promise.resolve(obs)),
}));

describe('PaymentGatewayAdapter', () => {
  let adapter: PaymentGatewayAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new PaymentGatewayAdapter(mockHttpService as any, mockConfigService as any);
  });

  describe('generateIntegritySignature', () => {
    it('generates correct SHA256 signature', () => {
      const reference = 'TXN-001';
      const amount = 180000;
      const currency = 'COP';
      const integrityKey = 'integrity_test_key';
      const raw = `${reference}${amount}${currency}${integrityKey}`;
      const expected = createHash('sha256').update(raw).digest('hex');
      const result = (adapter as any).generateIntegritySignature(reference, amount, currency);
      expect(result).toBe(expected);
    });
  });

  describe('mapStatus', () => {
    it('maps APPROVED correctly', () => {
      expect((adapter as any).mapStatus('APPROVED')).toBe('APPROVED');
    });
    it('maps DECLINED correctly', () => {
      expect((adapter as any).mapStatus('DECLINED')).toBe('DECLINED');
    });
    it('maps unknown status to ERROR', () => {
      expect((adapter as any).mapStatus('UNKNOWN_STATUS')).toBe('ERROR');
    });
  });
});
