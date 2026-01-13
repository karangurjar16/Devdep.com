import { S3 } from "aws-sdk";
import fs from "fs";
import path from "path";

import dotenv from "dotenv";

dotenv.config();

// Validation: Check if required environment variables are set
if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_ENDPOINT) {
    console.warn("⚠️ Warning: S3/R2 credentials not fully configured. Some operations may fail.");
}

const s3 = new S3({
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    endpoint: process.env.R2_ENDPOINT
});

// output/asdasd
export async function downloadS3Folder(prefix: string): Promise<void> {
    try {
        // Validation: Check if prefix is valid
        if (!prefix || typeof prefix !== 'string' || prefix.trim().length === 0) {
            throw new Error("Invalid prefix provided for S3 download");
        }

        console.log(`📥 Listing objects in S3 with prefix: ${prefix}...`);

        const allFiles = await s3.listObjectsV2({
            Bucket: "devdep",
            Prefix: prefix
        }).promise();

        if (!allFiles.Contents || allFiles.Contents.length === 0) {
            console.warn(`⚠️ No files found in S3 with prefix: ${prefix}`);
            return;
        }

        console.log(`📦 Found ${allFiles.Contents.length} file(s) to download`);

        const allPromises = allFiles.Contents.map(async ({ Key }) => {
            return new Promise<void>((resolve, reject) => {
                try {
                    if (!Key) {
                        resolve();
                        return;
                    }

                    const finalOutputPath = path.join(__dirname, Key);
                    const dirName = path.dirname(finalOutputPath);

                    // Create directory if it doesn't exist
                    if (!fs.existsSync(dirName)) {
                        fs.mkdirSync(dirName, { recursive: true });
                    }

                    const outputFile = fs.createWriteStream(finalOutputPath);

                    s3.getObject({
                        Bucket: "devdep",
                        Key
                    })
                        .createReadStream()
                        .pipe(outputFile)
                        .on("finish", () => {
                            console.log(`✅ Downloaded: ${Key}`);
                            resolve();
                        })
                        .on("error", (error) => {
                            console.error(`❌ Error downloading ${Key}:`, error.message);
                            reject(new Error(`Failed to download ${Key}: ${error.message}`));
                        });
                } catch (error: any) {
                    console.error(`❌ Error processing file ${Key}:`, error?.message || error);
                    reject(error);
                }
            });
        });

        console.log("⏳ Downloading files...");
        await Promise.all(allPromises);
        console.log(`✅ All files downloaded successfully`);
    } catch (error: any) {
        console.error(`❌ Error downloading S3 folder: ${error?.message || error}`);
        throw new Error(`Failed to download S3 folder: ${error?.message || 'Unknown error'}`);
    }
}

export async function copyFinalDist(id: string): Promise<void> {
    try {
        // Validation: Check if id is valid
        if (!id || typeof id !== 'string' || id.trim().length === 0) {
            throw new Error("Invalid deployment ID provided");
        }

        const folderPath = path.join(__dirname, `output/${id}/dist`);

        // Validation: Check if dist folder exists
        if (!fs.existsSync(folderPath)) {
            throw new Error(`Distribution folder does not exist: ${folderPath}`);
        }

        console.log(`📤 Uploading distribution files from: ${folderPath}`);

        const allFiles = getAllFiles(folderPath);

        if (allFiles.length === 0) {
            console.warn(`⚠️ No files found in distribution folder: ${folderPath}`);
            return;
        }

        console.log(`📦 Found ${allFiles.length} file(s) to upload`);

        const uploadPromises = allFiles.map(async (file) => {
            const relativePath = file.slice(folderPath.length + 1);
            const s3Key = `dist/${id}/${relativePath}`;
            await uploadFile(s3Key, file);
        });

        await Promise.all(uploadPromises);
        console.log(`✅ All distribution files uploaded successfully`);
    } catch (error: any) {
        console.error(`❌ Error copying final distribution: ${error?.message || error}`);
        throw new Error(`Failed to copy final distribution: ${error?.message || 'Unknown error'}`);
    }
}

const getAllFiles = (folderPath: string): string[] => {
    try {
        // Validation: Check if folder exists
        if (!fs.existsSync(folderPath)) {
            throw new Error(`Folder does not exist: ${folderPath}`);
        }

        let response: string[] = [];
        const allFilesAndFolders = fs.readdirSync(folderPath);

        allFilesAndFolders.forEach(file => {
            try {
                const fullFilePath = path.join(folderPath, file);
                const stats = fs.statSync(fullFilePath);

                if (stats.isDirectory()) {
                    response = response.concat(getAllFiles(fullFilePath));
                } else {
                    response.push(fullFilePath);
                }
            } catch (error: any) {
                console.warn(`⚠️ Error reading file/folder ${file}:`, error?.message || error);
            }
        });

        return response;
    } catch (error: any) {
        console.error(`❌ Error getting all files from ${folderPath}:`, error?.message || error);
        throw new Error(`Failed to get all files: ${error?.message || 'Unknown error'}`);
    }
}

const uploadFile = async (fileName: string, localFilePath: string): Promise<void> => {
    try {
        // Validation: Check if local file exists
        if (!fs.existsSync(localFilePath)) {
            throw new Error(`Local file does not exist: ${localFilePath}`);
        }

        const fileContent = fs.readFileSync(localFilePath);
        const response = await s3.upload({
            Body: fileContent,
            Bucket: "devdep",
            Key: fileName,
        }).promise();

        console.log(`✅ Uploaded file: ${fileName}`);
    } catch (error: any) {
        console.error(`❌ Error uploading file ${fileName}:`, error?.message || error);
        throw new Error(`Failed to upload file ${fileName}: ${error?.message || 'Unknown error'}`);
    }
}