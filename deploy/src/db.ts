import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // same as your main backend
  ssl: false // set true if using cloud db like Supabase / Neon
});
