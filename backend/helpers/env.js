import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envFile =
  process.env.NODE_ENV === 'production'
    ? path.join(__dirname, '../../.env.production')
    : path.join(__dirname, '../../.env');

dotenv.config({ path: envFile, override: true });