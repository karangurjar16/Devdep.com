import { createClient } from 'redis';

// Validation: Check Redis configuration
const redisConfig = {
    username: process.env.REDIS_USERNAME || 'default',
    password: process.env.REDIS_PASSWORD || '',
    socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379')
    }
};

// Validation: Check if port is valid
if (isNaN(redisConfig.socket.port) || redisConfig.socket.port < 1 || redisConfig.socket.port > 65535) {
    console.error(`❌ Invalid Redis port: ${process.env.REDIS_PORT}`);
    redisConfig.socket.port = 6379; // Default to standard Redis port
}

export const client = createClient(redisConfig);

client.on('error', (err) => {
    console.error('❌ Redis Client Error:', err.message || err);
});

client.on('connect', () => {
    console.log('🔌 Redis client connecting...');
});

client.on('ready', () => {
    console.log('✅ Redis client connected and ready');
});

client.on('reconnecting', () => {
    console.log('🔄 Redis client reconnecting...');
});

// Connect to Redis with error handling
(async () => {
    try {
        console.log(`📡 Connecting to Redis at ${redisConfig.socket.host}:${redisConfig.socket.port}...`);
        await client.connect();
        console.log('✅ Redis connection established successfully');
    } catch (error: any) {
        console.error(`❌ Failed to connect to Redis: ${error?.message || error}`);
        // Don't exit process, let it retry or handle gracefully
    }
})();


