import { createClient } from 'redis';

export const client = createClient({
    username: 'default',
    password: 'elc7vvMmhTnL9uh04d6mlcjbu9R5aKUl',
    socket: {
        host: 'redis-16871.crce217.ap-south-1-1.ec2.cloud.redislabs.com',
        port: 16871
    }
});

client.on('error', err => console.log('Redis Client Error', err));

(async () => {
    await client.connect();
})();


