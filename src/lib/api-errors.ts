/**
 * Shared API error code → user-friendly message helper.
 *
 * Creative API routes return sanitized error codes (not raw exception messages).
 * This helper maps known error codes to i18n keys so the frontend can show
 * localized, user-friendly messages instead of raw error codes.
 *
 * Usage:
 *   import { apiErrorMessage } from '@/lib/api-errors';
 *   const j = await res.json().catch(() => ({}));
 *   if (!res.ok) {
 *     const { key, fallback } = apiErrorMessage(j.error);
 *     setError(t(key) || fallback);
 *   }
 */

export interface ApiErrorInfo {
  /** i18n key for the error message (e.g., 'common.errPaymentRequired') */
  key: string;
  /** English fallback if the i18n key is missing */
  fallback: string;
}

/**
 * Map an API error code to a user-friendly i18n key + fallback.
 * Returns a generic error for unknown codes.
 */
export function apiErrorMessage(errorCode: string | undefined): ApiErrorInfo {
  switch (errorCode) {
    case 'insufficient_credits':
      return { key: 'common.errPaymentRequired', fallback: 'Not enough credits. Please top up on the pricing page.' };
    case 'atlas_insufficient_balance':
      return { key: 'common.errAtlasBalance', fallback: 'AI generation service is temporarily unavailable. Please try again later.' };
    case 'unauthorized':
      return { key: 'common.errUnauthorized', fallback: 'Your session has expired. Please sign in again.' };
    case 'forbidden':
      return { key: 'common.errForbidden', fallback: 'You do not have access to this resource.' };
    case 'not_found':
      return { key: 'common.errNotFound', fallback: 'The requested resource was not found.' };
    default:
      return { key: 'common.errGeneric', fallback: 'Something went wrong. Please try again.' };
  }
}
