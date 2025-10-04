import Stripe from "stripe";

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-09-30.clover",
      typescript: true,
    })
  : null as any as Stripe; // Placeholder for build time
