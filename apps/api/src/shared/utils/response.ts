export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface SuccessEnvelope<T> {
  data: T;
  error: null;
}

export interface FailureEnvelope {
  data: null;
  error: ApiError;
}

export function success<T>(data: T): SuccessEnvelope<T> {
  return { data, error: null };
}

export function failure(code: string, message: string, details?: unknown): FailureEnvelope {
  const error: ApiError = { code, message };
  if (details !== undefined) error.details = details;
  return { data: null, error };
}
