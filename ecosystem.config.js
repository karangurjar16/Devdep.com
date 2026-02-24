/**
 * PM2 Ecosystem File
 * Production process manager config for all backend services.
 *
 * Usage:
 *   pm2 start ecosystem.config.js        # Start all services
 *   pm2 restart ecosystem.config.js      # Restart all
 *   pm2 stop ecosystem.config.js         # Stop all
 *   pm2 logs                             # View logs
 *   pm2 save && pm2 startup              # Survive reboots
 */

module.exports = {
    apps: [
        {
            name: "upload",
            script: "./apps/upload/dist/index.js",
            cwd: "./",
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: "512M",
            env_file: "./apps/upload/.env",
            env: {
                NODE_ENV: "production",
            },
            error_file: "./logs/upload-error.log",
            out_file: "./logs/upload-out.log",
            log_date_format: "YYYY-MM-DD HH:mm:ss Z",
        },
        {
            name: "deploy",
            script: "./apps/deploy/dist/index.js",
            cwd: "./",
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: "1G",
            env_file: "./apps/deploy/.env",
            env: {
                NODE_ENV: "production",
            },
            error_file: "./logs/deploy-error.log",
            out_file: "./logs/deploy-out.log",
            log_date_format: "YYYY-MM-DD HH:mm:ss Z",
        },
        {
            name: "request",
            script: "./apps/request/dist/index.js",
            cwd: "./",
            instances: "max",                   // cluster mode for request server
            exec_mode: "cluster",
            autorestart: true,
            watch: false,
            max_memory_restart: "512M",
            env_file: "./apps/request/.env",
            env: {
                NODE_ENV: "production",
            },
            error_file: "./logs/request-error.log",
            out_file: "./logs/request-out.log",
            log_date_format: "YYYY-MM-DD HH:mm:ss Z",
        },
    ],
};
