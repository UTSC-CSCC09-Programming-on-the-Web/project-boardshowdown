import express from 'express';
import { OpenAI } from 'openai';
import http from 'http';
import https from 'https';
import url from 'url';
import { google } from 'googleapis';
import Stripe from 'stripe';
import crypto from 'crypto';
import session from 'express-session';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { client } from '../datasource.js';
import pgSession from 'connect-pg-simple';
process.on("uncaughtException", (err) => {
    console.error("🔥 [Uncaught Exception]", err);
});

  // Unhandled promise rejections (async)
process.on("unhandledRejection", (reason, promise) => {
  console.error("⚠️ [Unhandled Rejection]", reason, "Promise:", promise);
});
import { setSubscriptionActive, setSubscriptionPastDue, setSubscriptionCanceled } from '../queries/subscriptionQueries.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
//deploy 9x
const envFile =
  process.env.NODE_ENV === 'production'
    ? path.join(__dirname, '../../.env.production')
    : path.join(__dirname, '../../.env');

dotenv.config({ path: envFile, override: true });

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:3000/oauth2callback';

const app = express();
const allowedOrigins = [
  'https://boardshowdown.com',
  'https://api.boardshowdown.com',
  'http://localhost:3000',
  'http://localhost:4200'
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));


app.use(bodyParser.json({ limit: '25mb' }));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb' }));


/**
 * To use OAuth2 authentication, we need access to a CLIENT_ID, CLIENT_SECRET, AND REDIRECT_URI.
 * To get these credentials for your application, visit
 * https://console.cloud.google.com/apis/credentials.
 */
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_PUBLIC,
  `${process.env.GOOGLE_KEY}`,
  REDIRECT_URI
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

// Access scopes for two non-Sign-In scopes: Read-only Drive activity and Google Calendar.
const scopes = [
  'openid',
  'email',
  'profile'
];

/* Global variable that stores user credential in this code example.
 * ACTION ITEM for developers:
 *   Store user's refresh token in your data store if
 *   incorporating this code into your real app.
 *   For more information on handling refresh tokens,
 *   see https://github.com/googleapis/google-api-nodejs-client#handling-refresh-tokens
 */
app.set('trust proxy', 1);
let userCredential = null;
app.use(session({
    store: new (pgSession(session))({
      conObject: {
        host: process.env.POSTGRES_HOST || "localhost",
        user: process.env.POSTGRES_USER || "postgres",
        password: process.env.POSTGRES_PASSWORD || "postgres",
        port: process.env.POSTGRES_PORT ? parseInt(process.env.POSTGRES_PORT) : 5432,
      },
      createTableIfMissing: true
    }),
    secret: 'test', // Replace with a strong secret in production!
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      sameSite: 'lax'
    }
  }));

app.get('/auth/google', async (req, res) => {
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
    res.redirect(authorizationUrl);
  });

app.get('/oauth2callback', async (req, res) => {
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

  app.get('/revoke', async (req, res) => {
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

  app.get('/logout', async (req, res) => {
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

  app.get('/me', async (req, res) => {
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
app.post('/api/create-subscription-checkout', async (req, res) => {
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
      price: 'price_1RmU1mRfn0SZAA4wh3QkNPSI',
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
app.post(
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


////////////// OPEN AI API Integration //////////////

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_KEY,
});


async function extractLatexFromSvg(base64) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: [
          'You are an OCR and LaTeX assistant.',
          'Your only job is to extract exactly the characters the user has drawn in the provided image,',
          'then convert that into valid LaTeX syntax.',
          'Output *only* the LaTeX—no SVG, no commentary, no extra formatting.'
        ].join(' ')
      },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: base64 } },
          {
            type: 'text',
            text: [
              'Please return only the LaTeX you see in this image.',
              'For example, if the user has drawn an integral from –∞ to ∞ of x² dx = 1, output exactly:',
              '',
              '\\int_{-\\infty}^{\\\\infty} x^2 \\,dx = 1',
              '',
              'No code fences. No extra lines. No SVG tags. No explanation.'
            ].join('\n')
          }
        ]
      }
    ]
  });

  return completion.choices[0].message.content.trim();
}


app.post('/analyze-svg', async (req, res) => {
  const { base64 } = req.body;
  if (!base64) return res.status(400).json({ error: 'Missing base64' });

  console.log('Received SVG data URI:', base64);

  try {
    // ← now just one line here
    const latex = await extractLatexFromSvg(base64);

    res.json({ response: latex });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'OpenAI API call failed' });
  }
});

// Create attempt record
app.post('/api/create-attempt', async (req, res) => {
  const { userId, questionId, isCorrect } = req.body;
  
  if (!userId || !questionId || typeof isCorrect !== 'boolean') {
    return res.status(400).json({ error: 'Missing required fields: userId, questionId, isCorrect' });
  }

  try {
    // Check if user has already attempted this question
    const previousAttempts = await client.query(
      'SELECT COUNT(*) FROM Attempts WHERE user_id = $1 AND question_id = $2',
      [userId, questionId]
    );
    
    const attemptCount = parseInt(previousAttempts.rows[0].count);
    const isFirstAttempt = attemptCount === 0;
    
    // Get question difficulty and all attempts for this question
    const questionResult = await client.query(
      'SELECT difficulty FROM Questions WHERE id = $1',
      [questionId]
    );
    
    if (questionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    const difficulty = questionResult.rows[0].difficulty;
    
    // Get statistics for all attempts on this question
    const attemptsStats = await client.query(
      'SELECT COUNT(*) as total_attempts, COUNT(CASE WHEN is_correct = true THEN 1 END) as successful_attempts FROM Attempts WHERE question_id = $1',
      [questionId]
    );
    
    const totalAttempts = parseInt(attemptsStats.rows[0].total_attempts) || 0;
    const successfulAttempts = parseInt(attemptsStats.rows[0].successful_attempts) || 0;
    const unsuccessfulAttempts = totalAttempts - successfulAttempts;
    
    // Dynamic scoring formula
    // Base score = difficulty
    // Each successful attempt reduces score by 10% of difficulty (makes question easier)
    // Each unsuccessful attempt increases score by 5% of difficulty (makes question harder)
    // Minimum score is 1, maximum is difficulty * 2
    let calculatedScore = 0;
    if (isCorrect && isFirstAttempt) {
      const baseScore = difficulty;
      const successPenalty = successfulAttempts * (difficulty * 0.1);
      const failureBonus = unsuccessfulAttempts * (difficulty * 0.05);
      
      calculatedScore = baseScore - successPenalty + failureBonus;
      
      // Apply bounds: minimum 1, maximum 2x difficulty
      calculatedScore = Math.max(1, Math.min(calculatedScore, difficulty * 2));
      calculatedScore = Math.round(calculatedScore);
    }
    
    const result = await client.query(
      'INSERT INTO Attempts (user_id, question_id, is_correct, score) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, questionId, isCorrect, calculatedScore]
    );
    
    return res.json({ 
      success: true, 
      attempt: result.rows[0],
      isFirstAttempt: isFirstAttempt,
      scoreAwarded: calculatedScore,
      questionDifficulty: difficulty,
      questionStats: {
        totalAttempts: totalAttempts,
        successfulAttempts: successfulAttempts,
        unsuccessfulAttempts: unsuccessfulAttempts,
        successRate: totalAttempts > 0 ? Math.round((successfulAttempts / totalAttempts) * 100) : 0
      }
    });
  } catch (err) {
    console.error('create-attempt error:', err);
    return res.status(500).json({ error: 'Failed to create attempt record' });
  }
});

// Get leaderboard based on attempt scores
app.get('/api/leaderboard', async (req, res) => {
  try {
    // Get user scores by summing all their attempt scores
    const leaderboardResult = await client.query(`
      SELECT 
        u.id,
        u.name,
        u.username,
        u.profile_picture,
        COALESCE(SUM(a.score), 0) as total_score,
        COUNT(CASE WHEN a.is_correct = true AND a.score > 0 THEN 1 END) as correct_attempts,
        COUNT(a.id) as total_attempts
      FROM users u
      LEFT JOIN attempts a ON u.id = a.user_id
      GROUP BY u.id, u.name, u.username, u.profile_picture
      ORDER BY total_score DESC, correct_attempts DESC
      LIMIT 50
    `);
    
    const leaderboard = leaderboardResult.rows.map(row => ({
      id: row.id,
      name: row.name || row.username,
      username: row.username,
      profilePicture: row.profile_picture,
      score: parseInt(row.total_score),
      correctAttempts: parseInt(row.correct_attempts),
      totalAttempts: parseInt(row.total_attempts)
    }));
    
    return res.json({ success: true, data: leaderboard });
  } catch (err) {
    console.error('leaderboard error:', err);
    return res.status(500).json({ error: 'Failed to fetch leaderboard data' });
  }
});

app.post('/check-solution-ai', async (req, res) => {
  const { base64, questionId } = req.body;
  if (!base64 || !questionId) {
    return res.status(400).json({ error: 'Missing latex or questionId' });
  }

  try {
    // run extractLatexFromSvg to ensure the LaTeX is valid
    const extractedLatex = await extractLatexFromSvg(base64);
    console.log('Extracted LaTeX:', extractedLatex);
    // Convert questionId to integer
    const questionIdInt = parseInt(questionId, 10);
    if (isNaN(questionIdInt)) {
      return res.status(400).json({ error: 'Invalid questionId' });
    }

    // Validate the extracted LaTeX
    if (!extractedLatex || typeof extractedLatex !== 'string') {
      return res.status(400).json({ error: 'Invalid LaTeX format' });
    }

    // Log the received data
    console.log('Received data:', { base64: extractedLatex, questionId: questionIdInt });

    // 1) load expected solution from DB
    const { rows } = await client.query(
      'SELECT questions, solutions FROM Questions WHERE id = $1',
      [questionId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }
    const questionText = rows[0].questions;
    const expected = rows[0].solutions.toString();

    console.log('Fetched expected solution from DB:', expected);

    // 2) ask OpenAI to compare and give feedback
    const aiResp = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: [
        'You are a patient, expert math tutor.',
        'You will compare your LaTeX answer to the true solution for the given question.',
        'If the two match exactly, reply with "✅ Correct!" and nothing else.',
        'Otherwise, reply with "❌ Incorrect:" followed by:',
        '- A numbered, step-by-step check of your work, calling out each mistake in order.',
        '- The correct final answer.',
        '- A clear explanation of *why* that answer is correct (e.g. “to get 0.05 you must divide…”).',
        'Keep everything in one single string (no JSON, no extra fields).'
          ].join(' ')
        },
        {
          role: 'user',
          content: [
            `Question: ${questionText}`,
            `Your answer: ${extractedLatex}`,
            `Expected solution: ${expected}`
          ].join('\n')
        }
      ]
    });

    const feedback = aiResp.choices[0].message.content.trim();
    //const feedback = "temporary feedback for testing purposes"; // For testing purposes, replace with actual AI response

    //const feedbackTemporary = "temporary feedback for testing purposes";

    // 3) return the feedback
    return res.json({ extractedLatex, expected, feedback });
  } catch (err) {
    console.error('check-solution-ai error:', err);
    return res.status(500).json({ error: 'Evaluation failed' });
  }
});

///////////// ROOM MANAGEMENT ENDPOINTS /////////////

// Auto-join room when user navigates to whiteboard
app.post('/api/auto-join-room', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { roomId } = req.body;
  const userId = req.session.user.id;

  if (!roomId) {
    return res.status(400).json({ error: 'Room ID is required' });
  }

  try {
    const { roomParticipantsQuery } = await import('../queries/roomParticipantsQuery.js');
    
    // Join the room
    await client.query(roomParticipantsQuery.joinRoom, [userId, roomId]);
    
    // Get updated participant list
    const participants = await client.query(roomParticipantsQuery.getActiveParticipants, [roomId]);
    
    console.log(`User ${userId} (${req.session.user.username}) auto-joined room ${roomId}`);
    
    res.json({ 
      success: true, 
      participants: participants.rows,
      count: participants.rows.length
    });
  } catch (error) {
    console.error('Error auto-joining room:', error);
    res.status(500).json({ error: 'Failed to join room' });
  }
});

////////////////// Database Stuff ////////////////////
import { questionBankRouter } from "../routers/questionBankRouter.js";
import { userRouter } from "../routers/userRouter.js";
import { roomRouter } from "../routers/roomRouter.js";
import { initializeDatabase } from "../utils/dbInit.js";
import { roomCleanupService } from "../services/roomCleanupService.js";

// Initialize database
initializeDatabase()
  .then(() => {
    console.log("Database initialized successfully");
    // Start room cleanup service after database is ready
    roomCleanupService.start();
  })
  .catch((err) => console.error("Database initialization failed:", err));

app.use("/api/question-bank", questionBankRouter);
app.use("/api/users", userRouter);
app.use("/api/rooms", roomRouter);

// TODO: modularize this STRIPE API integration + Open AI

// app.listen(PORT, (err) => {
//   if (err) console.log(err);
//   else console.log("Backend running on http://localhost:%s", PORT);
// });





app.listen(3000, () => console.log('Server running on http://localhost:3000'));
