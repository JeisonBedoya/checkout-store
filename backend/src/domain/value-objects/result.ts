// Railway Oriented Programming - Result type
export type Result<T, E = string> =
  | { success: true; value: T }
  | { success: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ success: true, value });
export const err = <E>(error: E): Result<never, E> => ({ success: false, error });

export const isOk = <T, E>(result: Result<T, E>): result is { success: true; value: T } =>
  result.success === true;

export const isErr = <T, E>(result: Result<T, E>): result is { success: false; error: E } =>
  result.success === false;

export const mapResult = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U,
): Result<U, E> => {
  if (isOk(result)) return ok(fn(result.value));
  return result;
};

export const flatMapResult = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>,
): Result<U, E> => {
  if (isOk(result)) return fn(result.value);
  return result;
};
