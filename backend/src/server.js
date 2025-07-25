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
  'http://localhost:3000/oauth2callback',
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
  "264303411068-fub0t37hgdamhinje112blqarbl2tg9f.apps.googleusercontent.com",
  process.env.GOOGLE_KEY,
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
let userCredential = null;
app.use(session({
    secret: 'test', // Replace with a strong secret
    resave: false,
    saveUninitialized: false,
  }));

app.get('/auth/google', async (req, res) => {
    // Generate a secure random state value.
    const state = crypto.randomBytes(32).toString('hex');
    // Store state in the session
    console.log('HEREEE');
    req.session.state = state;

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

    res.redirect(authorizationUrl);
  });

app.get('/oauth2callback', async (req, res) => {
    // Handle the OAuth 2.0 server response
    let q = url.parse(req.url, true).query;

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
      console.log('User email:', profile.email);
      console.log('User profile:', profile);
      console.log('User profile picture:', profile.picture);
      console.log('User name:', profile.name);
      

      // add user info to database, if user does not exist
      // Check if user already exists
      const { userQuery } = await import('../queries/userQuery.js');
      try {
        const result = await client.query(userQuery.getUserByEmailQuery, [profile.email]);
        if (result.rows.length > 0) {
          console.log('User already exists:', result.rows[0]);
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
        }
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

  app.get('/me', async (req, res) => {
  if (!req.session.tokens || !req.session.tokens.access_token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  oauth2Client.setCredentials(req.session.tokens);
  const oauth2 = google.oauth2({
    auth: oauth2Client,
    version: 'v2',
  });
  const { data: profile } = await oauth2.userinfo.get();
  res.json(profile);
});


//// STRIPE API Integration ////

// ==== STRIPE SUBSCRIPTION CHECKOUT ====
app.post('/api/create-subscription-checkout', async (req, res) => {
  // ensure user is logged in
  if (!req.session.tokens) return res.status(401).send('Login required');
  const userEmail = req.session.tokens.email; // or fetch from your users table

  // 1) create or fetch Stripe Customer
  let customerId;
  // Fetch from DB
  const { userQuery } = await import('../queries/userQuery.js');
  try {
    const result = await client.query('SELECT stripe_customer_id FROM users WHERE email = $1', [userEmail]);
    customerId = result.rows[0]?.stripe_customer_id;
  } catch (err) {
    return res.status(500).send('Database error fetching Stripe customer ID');
  }
  if (!customerId) {
    const customer = await stripe.customers.create({ email: userEmail });
    customerId = customer.id;
    // Update users table with new Stripe customer ID
    try {
      await client.query(userQuery.setStripeCustomerId, [customerId, userEmail]);
    } catch (err) {
      return res.status(500).send('Database error updating Stripe customer ID');
    }
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
    success_url: `${FRONTEND_URL}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${FRONTEND_URL}/subscribe/cancel`,
  });

  res.json({ sessionId: session.id });
});

// ==== STRIPE WEBHOOKS ====
app.post(
  '/webhook',
  bodyParser.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body, sig, process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const obj = event.data.object;
    switch (event.type) {
      case 'checkout.session.completed': {
        const customerId = obj.customer;
        try {
          await client.query(setSubscriptionActive, [customerId]);
          console.log(`Set subscription_status=active for customer ${customerId}`);
        } catch (err) {
          console.error('DB error updating subscription_status to active:', err);
        }
        break;
      }
      case 'invoice.payment_failed': {
        const customerId = obj.customer;
        try {
          await client.query(setSubscriptionPastDue, [customerId]);
          console.log(`Set subscription_status=past_due for customer ${customerId}`);
        } catch (err) {
          console.error('DB error updating subscription_status to past_due:', err);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const customerId = obj.customer;
        try {
          await client.query(setSubscriptionCanceled, [customerId]);
          console.log(`Set subscription_status=canceled for customer ${customerId}`);
        } catch (err) {
          console.error('DB error updating subscription_status to canceled:', err);
        }
        break;
      }
    }
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

////////////////// Database Stuff ////////////////////
import { questionBankRouter } from "../routers/questionBankRouter.js";
import { userRouter } from "../routers/userRouter.js";
import { initializeDatabase } from "../utils/dbInit.js";

// Initialize database
initializeDatabase()
  .then(() => console.log("Database initialized successfully"))
  .catch((err) => console.error("Database initialization failed:", err));

app.use("/api/question-bank", questionBankRouter);
app.use("/api/users", userRouter);

// TODO: modularize this STRIPE API integration + Open AI

// app.listen(PORT, (err) => {
//   if (err) console.log(err);
//   else console.log("Backend running on http://localhost:%s", PORT);
// });





app.listen(3000, () => console.log('Server running on http://localhost:3000'));
