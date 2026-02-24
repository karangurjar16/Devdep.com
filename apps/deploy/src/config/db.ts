import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

// Validation: Check if DATABASE_URL is provided
if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL environment variable is not set");
    throw new Error("DATABASE_URL is required but not provided");
}

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // same as your main backend
    ssl: false // set true if using cloud db like Supabase / Neon
});

// Error handling for pool
pool.on('error', (err) => {
    console.error('❌ Unexpected database pool error:', err.message || err);
});

pool.on('connect', () => {
    console.log('🔌 Database pool connecting...');
});

// Test database connection
(async () => {
    try {
        console.log('📊 Testing database connection...');
        const client = await pool.connect();
        console.log('✅ Database connection successful');
        client.release();
    } catch (error: any) {
        console.error(`❌ Database connection failed: ${error?.message || error}`);
        // Don't exit process, let it retry or handle gracefully
    }
})();
