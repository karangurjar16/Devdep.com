import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

// Validation: Check if required environment variables are set
if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_ENDPOINT) {
    console.warn("⚠️ Warning: S3/R2 credentials not fully configured. Some operations may fail.");
}

export const s3 = new S3Client({
    region: "auto",
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
    endpoint: process.env.R2_ENDPOINT
});
