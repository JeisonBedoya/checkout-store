import {
  detectCardBrand,
  formatCardNumber,
  validateLuhn,
  formatCurrency,
  maskCardNumber,
} from '../../utils/card.utils';

describe('detectCardBrand', () => {
  it('detects Visa by leading 4', () => {
    expect(detectCardBrand('4111111111111111')).toBe('visa');
    expect(detectCardBrand('4000 0000 0000 0002')).toBe('visa');
  });

  it('detects Mastercard by 5x prefix', () => {
    expect(detectCardBrand('5500000000000004')).toBe('mastercard');
    expect(detectCardBrand('5105105105105100')).toBe('mastercard');
  });

  it('detects Mastercard by 2x prefix range', () => {
    expect(detectCardBrand('2221000000000000')).toBe('mastercard');
    expect(detectCardBrand('2720000000000000')).toBe('mastercard');
  });

  it('returns unknown for unrecognized', () => {
    expect(detectCardBrand('3714496353984312')).toBe('unknown'); // Amex
    expect(detectCardBrand('')).toBe('unknown');
  });
});

describe('formatCardNumber', () => {
  it('groups digits in sets of 4', () => {
    expect(formatCardNumber('4111111111111111')).toBe('4111 1111 1111 1111');
  });

  it('strips non-digit characters', () => {
    expect(formatCardNumber('4111-1111-1111-1111')).toBe('4111 1111 1111 1111');
  });

  it('truncates to 16 digits', () => {
    expect(formatCardNumber('12345678901234567')).toBe('1234 5678 9012 3456');
  });
});

describe('validateLuhn', () => {
  it('validates correct Visa test number', () => {
    expect(validateLuhn('4111111111111111')).toBe(true);
  });

  it('validates correct Mastercard test number', () => {
    expect(validateLuhn('5500000000000004')).toBe(true);
  });

  it('rejects invalid card number', () => {
    expect(validateLuhn('1234567890123456')).toBe(false);
  });

  it('rejects non-numeric input', () => {
    expect(validateLuhn('411111111111abc')).toBe(false);
  });

  it('rejects too short input', () => {
    expect(validateLuhn('411')).toBe(false);
  });

  it('handles spaces', () => {
    expect(validateLuhn('4111 1111 1111 1111')).toBe(true);
  });
});

describe('formatCurrency', () => {
  it('formats COP cents correctly', () => {
    const result = formatCurrency(100000);
    expect(result).toContain('$');
    expect(result).toContain('1.000');
  });

  it('handles zero', () => {
    const result = formatCurrency(0);
    expect(result).toContain('$');
  });
});

describe('maskCardNumber', () => {
  it('masks all but last 4 digits', () => {
    expect(maskCardNumber('4111111111111111')).toBe('**** **** **** 1111');
  });

  it('works with spaces', () => {
    expect(maskCardNumber('4111 1111 1111 1111')).toBe('**** **** **** 1111');
  });
});
