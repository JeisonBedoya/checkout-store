import { ok, err, isOk, isErr, mapResult, flatMapResult } from '../../domain/value-objects/result';

describe('Result (ROP)', () => {
  describe('ok', () => {
    it('creates a successful result', () => {
      const result = ok(42);
      expect(result.success).toBe(true);
      expect((result as any).value).toBe(42);
    });
  });

  describe('err', () => {
    it('creates an error result', () => {
      const result = err('Something went wrong');
      expect(result.success).toBe(false);
      expect((result as any).error).toBe('Something went wrong');
    });
  });

  describe('isOk', () => {
    it('returns true for ok results', () => {
      expect(isOk(ok('test'))).toBe(true);
    });
    it('returns false for err results', () => {
      expect(isOk(err('fail'))).toBe(false);
    });
  });

  describe('isErr', () => {
    it('returns true for err results', () => {
      expect(isErr(err('fail'))).toBe(true);
    });
    it('returns false for ok results', () => {
      expect(isErr(ok('success'))).toBe(false);
    });
  });

  describe('mapResult', () => {
    it('transforms value on success', () => {
      const result = mapResult(ok(5), (v) => v * 2);
      expect(isOk(result)).toBe(true);
      expect((result as any).value).toBe(10);
    });
    it('passes error through', () => {
      const result = mapResult(err('fail'), (v: number) => v * 2);
      expect(isErr(result)).toBe(true);
    });
  });

  describe('flatMapResult', () => {
    it('chains ok results', () => {
      const result = flatMapResult(ok(5), (v) => ok(v + 1));
      expect((result as any).value).toBe(6);
    });
    it('short-circuits on error', () => {
      const result = flatMapResult(err<number, string>('fail'), (v) => ok(v + 1));
      expect(isErr(result)).toBe(true);
    });
    it('returns inner error', () => {
      const result = flatMapResult(ok(5), (_) => err('inner error'));
      expect(isErr(result)).toBe(true);
      expect((result as any).error).toBe('inner error');
    });
  });
});
