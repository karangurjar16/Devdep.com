import { S3 } from "aws-sdk";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const s3 = new S3({
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    endpoint: process.env.R2_ENDPOINT
})


export const uploadFile = async (fileName: string, localFilePath: string) => {
    const fileContent = fs.readFileSync(localFilePath);
    const response = await s3.upload({
        Body: fileContent,
        Bucket: "devdep",
        Key: fileName,
    }).promise();
}

export async function deleteS3Folder(id: string): Promise<void> {
    try {
        if (!id || typeof id !== 'string' || id.trim().length === 0) {
            throw new Error("Invalid deployment ID provided");
        }

        const prefix = `dist/${id}/`;
        console.log(`🗑️ Deleting S3 objects with prefix: ${prefix}...`);

        const listResponse = await s3.listObjectsV2({
            Bucket: "devdep",
            Prefix: prefix
        }).promise();

        if (!listResponse.Contents || listResponse.Contents.length === 0) {
            console.log(`ℹ️ No files found in S3 with prefix: ${prefix}`);
            return;
        }

        console.log(`📦 Found ${listResponse.Contents.length} file(s) to delete`);

        const objectsToDelete = listResponse.Contents.map(({ Key }) => ({ Key: Key! }));

        const deleteResponse = await s3.deleteObjects({
            Bucket: "devdep",
            Delete: {
                Objects: objectsToDelete,
                Quiet: false
            }
        }).promise();

        console.log(`✅ Successfully deleted ${deleteResponse.Deleted?.length || 0} file(s) from S3`);

        if (deleteResponse.Errors && deleteResponse.Errors.length > 0) {
            console.warn(`⚠️ Failed to delete ${deleteResponse.Errors.length} file(s):`, deleteResponse.Errors);
        }
    } catch (error: any) {
        console.error(`❌ Error deleting S3 folder: ${error?.message || error}`);
        throw new Error(`Failed to delete S3 folder: ${error?.message || 'Unknown error'}`);
    }
}

export async function stopPM2Process(id: string): Promise<{ status: string; process: string; error?: string }> {
    const { exec } = require('child_process');

    return new Promise((resolve) => {
        if (!id || typeof id !== 'string' || id.trim().length === 0) {
            resolve({
                status: "failed",
                process: id,
                error: "Invalid deployment ID provided"
            });
            return;
        }

        console.log(`🗑️ Stopping PM2 process: ${id}...`);

        exec(`cmd /c "pm2 delete ${id}"`, (error: any, stdout: string, stderr: string) => {
            if (error) {
                if (error.message?.includes("doesn't exist") || stderr?.includes("doesn't exist")) {
                    console.log(`ℹ️ PM2 process ${id} not found (already deleted)`);
                    resolve({
                        status: "not_found",
                        process: id
                    });
                } else {
                    console.error(`❌ Failed to stop PM2 process ${id}:`, error.message);
                    resolve({
                        status: "failed",
                        process: id,
                        error: error.message
                    });
                }
            } else {
                console.log(`✅ PM2 process ${id} stopped and removed successfully`);
                console.log(`📊 PM2 Output: ${stdout}`);
                resolve({
                    status: "stopped",
                    process: id
                });
            }
        });
    });
}
