/**
 * PM2 Ecosystem File
 * Production process manager config for Devdep backend services
 */

module.exports = {
    apps: [
        /* =========================
           UPLOAD SERVICE
        ========================== */
        {
            name: "upload",
            script: "dist/index.js",
            cwd: "./apps/upload",
            interpreter: "node",

            instances: 1,
            exec_mode: "fork",

            autorestart: true,
            watch: false,
            max_memory_restart: "512M",

            env: {
                NODE_ENV: "production",
            },

            error_file: "../../logs/upload-error.log",
            out_file: "../../logs/upload-out.log",
            log_date_format: "YYYY-MM-DD HH:mm:ss",
            merge_logs: true,
            time: true,
        },

        /* =========================
           DEPLOY SERVICE
        ========================== */
        {
            name: "deploy",
            script: "dist/index.js",
            cwd: "./apps/deploy",
            interpreter: "node",

            instances: 1,
            exec_mode: "fork",

            autorestart: true,
            watch: false,
            max_memory_restart: "1G",

            env: {
                NODE_ENV: "production",
            },

            error_file: "../../logs/deploy-error.log",
            out_file: "../../logs/deploy-out.log",
            log_date_format: "YYYY-MM-DD HH:mm:ss",
            merge_logs: true,
            time: true,
        },

        /* =========================
           REQUEST SERVICE (Cluster)
        ========================== */
        {
            name: "request",
            script: "dist/index.js",
            cwd: "./apps/request",
            interpreter: "node",

            instances: "max",
            exec_mode: "cluster",

            autorestart: true,
            watch: false,
            max_memory_restart: "512M",

            env: {
                NODE_ENV: "production",
            },

            error_file: "../../logs/request-error.log",
            out_file: "../../logs/request-out.log",
            log_date_format: "YYYY-MM-DD HH:mm:ss",
            merge_logs: true,
            time: true,
        },
    ],
};