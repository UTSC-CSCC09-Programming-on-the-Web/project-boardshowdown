import express from 'express';
import session from 'express-session';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pgSession from 'connect-pg-simple';
import authRouter from '../routers/authRouter.js';
import openaiRouter from '../routers/openaiRouter.js';
import leaderboardRouter from '../routers/leaderboardRouter.js';
process.on("uncaughtException", (err) => {
    console.error("[Uncaught Exception]", err);
});

  // Unhandled promise rejections (async)
process.on("unhandledRejection", (reason, promise) => {
  console.error("[Unhandled Rejection]", reason, "Promise:", promise);
});

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




/* Global variable that stores user credential in this code example.
 * ACTION ITEM for developers:
 *   Store user's refresh token in your data store if
 *   incorporating this code into your real app.
 *   For more information on handling refresh tokens,
 *   see https://github.com/googleapis/google-api-nodejs-client#handling-refresh-tokens
 */
app.set('trust proxy', 1);
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







///////////// ROOM MANAGEMENT ENDPOINTS /////////////


////////////////// Database Stuff ////////////////////
import { questionBankRouter } from "../routers/questionBankRouter.js";
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
app.use('/auth', authRouter);
app.use('/api/openai', openaiRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use("/api/rooms", roomRouter);

// TODO: modularize this STRIPE API integration + Open AI

// app.listen(PORT, (err) => {
//   if (err) console.log(err);
//   else console.log("Backend running on http://localhost:%s", PORT);
// });





app.listen(3000, () => console.log('Server running on http://localhost:3000'));
