// queries/subscriptionQueries.js
// Centralized queries for Stripe subscription status updates

export const setSubscriptionActive = `
  UPDATE users SET subscription_status = 'active' WHERE stripe_customer_id = $1
`;

export const setSubscriptionPastDue = `
  UPDATE users SET subscription_status = 'past_due' WHERE stripe_customer_id = $1
`;

export const setSubscriptionCanceled = `
  UPDATE users SET subscription_status = 'canceled' WHERE stripe_customer_id = $1
`;
