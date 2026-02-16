import { createClient } from 'redis';

const redisConfig = {
    username: process.env.REDIS_USERNAME || 'default',
    password: process.env.REDIS_PASSWORD || '',
    socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379')
    }
};

// Validate port
if (isNaN(redisConfig.socket.port) || redisConfig.socket.port < 1 || redisConfig.socket.port > 65535) {
    console.error(`❌ Invalid Redis port, using default 6379`);
    redisConfig.socket.port = 6379;
}

export const client = createClient(redisConfig);

// Essential error handling
client.on('error', (err) => console.error('❌ Redis Error:', err.message || err));

// Connect to Redis
(async () => {
    try {
        await client.connect();
        console.log('✅ Redis connected');
    } catch (error: any) {
        console.error(`❌ Redis connection failed: ${error?.message || error}`);
    }
})();


