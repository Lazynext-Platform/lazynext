import type { PaymentProvider } from './types';
import { dodoProvider } from './dodo';
import { atlasProvider } from './atlas';

export type { PaymentProvider, CheckoutArgs } from './types';

function selected(): string {
  return (process.env.PAYMENT_PROVIDER || 'dodo').toLowerCase();
}

export function paymentProvider(): PaymentProvider {
  return selected() === 'atlas' ? atlasProvider : dodoProvider;
}

export function paymentMode(): 'checkout' | 'redeem' {
  return selected() === 'atlas' ? 'redeem' : 'checkout';
}
