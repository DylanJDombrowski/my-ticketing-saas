import Stripe from 'stripe';

// Server-side Stripe instance
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-09-30.clover',
      typescript: true,
    })
  : null as any as Stripe; // Placeholder for build time

// Stripe client publishable key for frontend
export const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!;

// Payment configuration
export const STRIPE_CONFIG = {
  currency: 'usd',
  paymentMethodTypes: ['card'],
  successUrl: process.env.NEXT_PUBLIC_APP_URL + '/payment/success?session_id={CHECKOUT_SESSION_ID}',
  cancelUrl: process.env.NEXT_PUBLIC_APP_URL + '/payment/cancel',
};

// Helper: Format amount for Stripe (cents)
export function formatAmountForStripe(amount: number): number {
  // Stripe expects amounts in smallest currency unit (cents for USD)
  return Math.round(amount * 100);
}

// Helper: Format amount from Stripe (dollars)
export function formatAmountFromStripe(amount: number): number {
  return amount / 100;
}
