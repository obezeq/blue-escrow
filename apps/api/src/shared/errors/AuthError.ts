import { AppError } from './AppError.js';

export class AuthError extends AppError {
  readonly statusCode = 401;
  readonly code = 'AUTH_REQUIRED';
}
