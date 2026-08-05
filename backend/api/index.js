import app from '../src/app.js';
import { connectDatabase } from '../src/config/database.js';

export default async function handler(req, res) {
  try {
    await connectDatabase();
  } catch (err) {
    console.error('Database connection failed in serverless handler:', err);
  }
  return app(req, res);
}
