/**
 * Re-export from the root auth.ts (Auth.js v5 convention).
 *
 * In v5, the auth configuration lives in auth.ts at the project root.
 * This file re-exports the public API for backward-compatible imports.
 */
export { auth, signIn, signOut, handlers, getEnabledProviderIds } from '@/../auth';
