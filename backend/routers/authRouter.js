import express from 'express';
import { google } from 'googleapis';
import crypto from 'crypto';
import url from 'url';
import https from 'https';
import { client } from '../datasource.js';
import Stripe from 'stripe';
import { setSubscriptionActive, setSubscriptionPastDue, setSubscriptionCanceled } from '../queries/subscriptionQueries.js';
import bodyParser from 'body-parser';

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:3000/auth/oauth2callback';

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENTID,
  `${process.env.GOOGLE_KEY}`,
  REDIRECT_URI
);

const scopes = [
  'openid',
  'email',
  'profile'
];
let userCredential = null;


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

router.get('/google', async (req, res) => {
    // Generate a secure random state value.
    const state = crypto.randomBytes(32).toString('hex');
    // Store state in the session
    console.log('HEREEE');
    req.session.state = state;
    console.log('Session state:', req.session.state);

    // Generate a url that asks permissions for the Drive activity and Google Calendar scope
    const authorizationUrl = oauth2Client.generateAuthUrl({
      // 'online' (default) or 'offline' (gets refresh_token)
      access_type: 'offline',
      /** Pass in the scopes array defined above.
        * Alternatively, if only one scope is needed, you can pass a scope URL as a string */
      scope: scopes,
      // Enable incremental authorization. Recommended as a best practice.
      include_granted_scopes: true,
      // Include the state parameter to reduce the risk of CSRF attacks.
      state: state
    });
    console.log('Authorization URL:', authorizationUrl);
    console.log('REDIRECT_URI :', REDIRECT_URI);
    res.redirect(authorizationUrl);
  });

router.get('/oauth2callback', async (req, res) => {
    // Handle the OAuth 2.0 server response
    let q = url.parse(req.url, true).query;
    console.log("Q state:", q.state);
    console.log("Session state:", req.session.state);

    if (q.error) { // An error response e.g. error=access_denied
      console.log('Error:' + q.error);
    } else if (q.state !== req.session.state) { //check state value
      console.log('State mismatch. Possible CSRF attack');
      res.end('State mismatch. Possible CSRF attack');
    } else { // Get access and refresh tokens (if access_type is offline)
      let { tokens } = await oauth2Client.getToken(q.code);
      oauth2Client.setCredentials(tokens);

      /** Save credential to the global variable in case access token was refreshed.
        * ACTION ITEM: In a production app, you likely want to save the refresh token
        *              in a secure persistent database instead. */
      userCredential = tokens;
      console.log('Tokens acquired:', tokens);
      req.session.tokens = tokens;

      const oauth2 = google.oauth2({
        auth: oauth2Client,
        version: 'v2',
      });

      const { data: profile } = await oauth2.userinfo.get();

      // add user info to database, if user does not exist
      // Check if user already exists
      const { userQuery } = await import('../queries/userQuery.js');
      let user = null;
      try {
        const result = await client.query(userQuery.getUserByEmailQuery, [profile.email]);
        if (result.rows.length > 0) {
          console.log('User already exists:', result.rows[0]);
          user = result.rows[0];
        }
        else {
          // User does not exist, create a new user
          // Extract username from profile.name if it exists in parentheses
          let username = null;

          if (profile.name) {
            // Look for username in parentheses: "First Last (username)"
            const usernameMatch = profile.name.match(/\(([^)]+)\)$/);
            if (usernameMatch) {
              username = usernameMatch[1].toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
            }
          }

          // Fallback: if no username in parentheses, extract from email
          if (!username) {
            const baseUsername = profile.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
            username = baseUsername.toLowerCase();
          }

          // Ensure username is not empty and has minimum length
          if (!username || username.length < 3) {
            username = `user${Date.now()}`;
          }

          // Check if username already exists, if so, add a random number
          let uniqueUsername = username;
          let attempts = 0;
          while (attempts < 5) {
            const existingUsername = await client.query(userQuery.getUserByUsernameQuery, [uniqueUsername]);
            if (existingUsername.rows.length === 0) {
              break; // Username is unique
            }
            uniqueUsername = `${username}${Math.floor(Math.random() * 10000)}`;
            attempts++;
          }

          // get name as profile.given_name + profile.family_name
          const name = profile.given_name && profile.family_name
            ? `${profile.given_name} ${profile.family_name}`
            : profile.name || null;

          const newUser = await client.query(userQuery.createUserQuery, [
            profile.email,
            uniqueUsername,
            name || null,
            profile.picture || null
          ]);
          console.log('New user created:', newUser.rows[0]);
          user = newUser.rows[0];
        }

        // Store user info in session for efficient access
        req.session.user = user;

      } catch (error) {
        console.error('Error checking user existence:', error);
      }
      res.redirect(`${FRONTEND_URL}`);

      // do your thing here

    }
  });

  router.get('/revoke', async (req, res) => {
    // Build the string for the POST request
    let postData = "token=" + userCredential.access_token;

    // Options for POST request to Google's OAuth 2.0 server to revoke a token
    let postOptions = {
      host: 'oauth2.googleapis.com',
      port: '443',
      path: '/revoke',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    // Set up the request
    const postReq = https.request(postOptions, function (res) {
      res.setEncoding('utf8');
      res.on('data', d => {
        console.log('Response: ' + d);
      });
    });

    postReq.on('error', error => {
      console.log(error)
    });

    // Post the request with data
    postReq.write(postData);
    postReq.end();
  });

  router.get('/logout', async (req, res) => {
    console.log('Logout endpoint called');

    try {
      // Clear the session
      req.session.destroy((err) => {
        if (err) {
          console.error('Error destroying session:', err);
          return res.status(500).json({ error: 'Failed to logout' });
        }

        console.log('Session destroyed successfully');
        res.clearCookie('connect.sid'); // Clear the session cookie
        res.json({ message: 'Logged out successfully' });
      });
    } catch (error) {
      console.error('Error during logout:', error);
      res.status(500).json({ error: 'Failed to logout' });
    }
  });

  router.get('/me', async (req, res) => {
  console.log('/me endpoint called');
  console.log('Session tokens present:', !!req.session.tokens);
  console.log('Session user data present:', !!req.session.user);

  if (!req.session.tokens || !req.session.tokens.access_token) {
    console.log('User not authenticated - no session tokens');
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    // Get user from database first
    let user = null;

    if (req.session.user) {
      user = req.session.user;
      console.log('Using session user data for:', user.email);
    } else {
      // Fallback: get user email from Google and find in database
      console.log('No session user data, falling back to Google API');
      oauth2Client.setCredentials(req.session.tokens);
      const oauth2 = google.oauth2({
        auth: oauth2Client,
        version: 'v2',
      });
      const { data: profile } = await oauth2.userinfo.get();
      console.log('Got profile from Google for:', profile.email);

      const { userQuery } = await import('../queries/userQuery.js');
      const result = await client.query(userQuery.getUserByEmailQuery, [profile.email]);

      if (result.rows.length > 0) {
        user = result.rows[0];
        req.session.user = user; // Store in session for next time
        console.log('Stored user in session for future requests');
      } else {
        console.log('User not found in DB for Google profile email:', profile.email);
        return res.json({
          ...profile,
          subscription_status: 'inactive'
        });
      }
    }

    // Now check subscription status directly from Stripe if user has a customer ID
    let subscriptionStatus = 'inactive';

    if (user.stripe_customer_id) {
      console.log('Checking Stripe subscription status for customer:', user.stripe_customer_id);

      try {
        // Get active subscriptions for this customer
        const subscriptions = await stripe.subscriptions.list({
          customer: user.stripe_customer_id,
          status: 'active',
          limit: 1
        });

        console.log('Stripe subscriptions found:', subscriptions.data.length);

        if (subscriptions.data.length > 0) {
          const subscription = subscriptions.data[0];
          console.log('Active subscription found:', {
            id: subscription.id,
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000)
          });
          subscriptionStatus = 'active';

          // Update database with the correct status if it's different
          if (user.subscription_status !== 'active') {
            console.log('Updating database subscription status to active');
            const { userQuery } = await import('../queries/userQuery.js');
            await client.query(
              'UPDATE users SET subscription_status = $1 WHERE stripe_customer_id = $2',
              ['active', user.stripe_customer_id]
            );
            user.subscription_status = 'active';
            req.session.user = user; // Update session
          }
        } else {
          console.log('No active subscriptions found for customer');

          // Check if there are any subscriptions in other states
          const allSubscriptions = await stripe.subscriptions.list({
            customer: user.stripe_customer_id,
            limit: 5
          });

          console.log('All subscriptions for customer:', allSubscriptions.data.map(sub => ({
            id: sub.id,
            status: sub.status,
            created: new Date(sub.created * 1000)
          })));

          subscriptionStatus = 'inactive';

          // Update database if status is different
          if (user.subscription_status !== 'inactive') {
            console.log('Updating database subscription status to inactive');
            await client.query(
              'UPDATE users SET subscription_status = $1 WHERE stripe_customer_id = $2',
              ['inactive', user.stripe_customer_id]
            );
            user.subscription_status = 'inactive';
            req.session.user = user; // Update session
          }
        }

      } catch (stripeError) {
        console.error('Error checking Stripe subscription:', stripeError);
        // Fall back to database status if Stripe API fails
        subscriptionStatus = user.subscription_status || 'inactive';
      }
    } else {
      console.log('No Stripe customer ID, subscription status: inactive');
      subscriptionStatus = 'inactive';
    }

    const responseData = {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      profile_picture: user.profile_picture,
      subscription_status: subscriptionStatus,
      stripe_customer_id: user.stripe_customer_id
    };

    console.log(' Sending response:', responseData);
    res.json(responseData);

  } catch (error) {
    console.error(' Error fetching user info:', error);
    res.status(500).json({ error: 'Failed to fetch user info' });
  }
});

//// STRIPE API Integration ////

// ==== STRIPE SUBSCRIPTION CHECKOUT ====
router.post('/create-subscription-checkout', async (req, res) => {
  // ensure user is logged in
  if (!req.session.tokens) return res.status(401).send('Login required');

  try {
    let user = null;

    // Use user data from session if available
    if (req.session.user) {
      user = req.session.user;
    } else {
      // Fallback: get user from database using Google profile
      oauth2Client.setCredentials(req.session.tokens);
      const oauth2 = google.oauth2({
        auth: oauth2Client,
        version: 'v2',
      });
      const { data: profile } = await oauth2.userinfo.get();

      const { userQuery } = await import('../queries/userQuery.js');
      const userResult = await client.query(userQuery.getUserByEmailQuery, [profile.email]);

      if (userResult.rows.length === 0) {
        return res.status(404).send('User not found in database');
      }

      user = userResult.rows[0];
      req.session.user = user; // Store for future use
    }

    let customerId = user.stripe_customer_id;

    // 1) create Stripe Customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          user_id: user.id,
          username: user.username
        }
      });
      customerId = customer.id;

      // Update users table with new Stripe customer ID
      const { userQuery } = await import('../queries/userQuery.js');
      await client.query(userQuery.setStripeCustomerId, [customerId, user.email]);

      // Update session data
      req.session.user.stripe_customer_id = customerId;
    }

  // 2) create Checkout Session
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer: customerId,
    line_items: [{
      price: process.env.STRIPE_PRICE_ID,
      quantity: 1,
    }],
    success_url: `${FRONTEND_URL}?session_id={CHECKOUT_SESSION_ID}&payment=success`,
    cancel_url:  `${FRONTEND_URL}?payment=canceled`,
  });

  res.json({ sessionId: session.id });

  } catch (error) {
    console.error('Error creating subscription checkout:', error);
    res.status(500).send('Failed to create checkout session');
  }
});

// ==== STRIPE WEBHOOKS ====
router.post(
  '/webhook',
  bodyParser.raw({ type: 'application/json' }),
  async (req, res) => {
    console.log('Webhook received');
    const sig = req.headers['stripe-signature'];
    console.log('Webhook signature present:', !!sig);
    console.log('Webhook secret configured:', !!process.env.STRIPE_WEBHOOK_SECRET);

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body, sig, process.env.STRIPE_WEBHOOK_SECRET
      );
      console.log('Webhook signature verified successfully');
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const obj = event.data.object;
    console.log(`Received Stripe webhook: ${event.type}`);
    console.log('Webhook object:', JSON.stringify(obj, null, 2));

    switch (event.type) {
      case 'checkout.session.completed': {
        const customerId = obj.customer;
        console.log(`Processing checkout.session.completed for customer: ${customerId}`);

        // Let's also check what user this customer ID belongs to
        try {
          const userCheck = await client.query(
            'SELECT email, username, subscription_status FROM users WHERE stripe_customer_id = $1',
            [customerId]
          );

          if (userCheck.rows.length > 0) {
            const user = userCheck.rows[0];
            console.log(`Found user for customer ${customerId}:`, user);
            console.log(`    Email: ${user.email}`);
            console.log(`    Username: ${user.username}`);
            console.log(`    Current subscription_status: ${user.subscription_status}`);
          } else {
            console.log(` No user found for customer ID: ${customerId}`);
          }
        } catch (err) {
          console.error('Error checking user for customer ID:', err);
        }

        try {
          const result = await client.query(setSubscriptionActive, [customerId]);
          console.log(`Set subscription_status=active for customer ${customerId}`);
          console.log(` Database update result:`, result);
          console.log(` Rows affected:`, result.rowCount);

          // Verify the update worked
          const verifyResult = await client.query(
            'SELECT email, subscription_status FROM users WHERE stripe_customer_id = $1',
            [customerId]
          );

          if (verifyResult.rows.length > 0) {
            console.log(`Verification - User now has subscription_status: ${verifyResult.rows[0].subscription_status}`);
          } else {
            console.log(` Verification failed - no user found with customer ID: ${customerId}`);
          }

        } catch (err) {
          console.error(' DB error updating subscription_status to active:', err);
        }
        break;
      }
      case 'invoice.payment_failed': {
        const customerId = obj.customer;
        console.log(`Processing invoice.payment_failed for customer: ${customerId}`);
        try {
          const result = await client.query(setSubscriptionPastDue, [customerId]);
          console.log(` Set subscription_status=past_due for customer ${customerId}`);
          console.log(` Rows affected:`, result.rowCount);
        } catch (err) {
          console.error(' DB error updating subscription_status to past_due:', err);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const customerId = obj.customer;
        console.log(` Processing customer.subscription.deleted for customer: ${customerId}`);
        try {
          const result = await client.query(setSubscriptionCanceled, [customerId]);
          console.log(`Set subscription_status=canceled for customer ${customerId}`);
          console.log(` Rows affected:`, result.rowCount);
        } catch (err) {
          console.error(' DB error updating subscription_status to canceled:', err);
        }
        break;
      }
      default:
        console.log(` Unhandled webhook event type: ${event.type}`);
    }

    console.log(' Webhook processing completed, sending response');
    res.json({ received: true });
  }
);

export default router;
