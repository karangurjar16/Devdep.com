import fs from "fs";
import path from "path";
import { s3 } from "@repo/aws";
import { GetObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { Upload } from "@aws-sdk/lib-storage";

// Helper to convert stream to stream that can be piped (or just return the stream)
// In v3, response.Body is a Readable Stream in Node.js

// output/asdasd
export async function downloadS3Folder(prefix: string): Promise<void> {
    try {
        // Validation: Check if prefix is valid
        if (!prefix || typeof prefix !== 'string' || prefix.trim().length === 0) {
            throw new Error("Invalid prefix provided for S3 download");
        }

        console.log(`📥 Listing objects in S3 with prefix: ${prefix}...`);

        const command = new ListObjectsV2Command({
            Bucket: "devdep",
            Prefix: prefix
        });

        const allFiles = await s3.send(command);

        if (!allFiles.Contents || allFiles.Contents.length === 0) {
            console.warn(`⚠️ No files found in S3 with prefix: ${prefix}`);
            return;
        }

        console.log(`📦 Found ${allFiles.Contents.length} file(s) to download`);

        const allPromises = allFiles.Contents.map(async ({ Key }) => {
            if (!Key) return;

            try {
                const finalOutputPath = path.join(__dirname, Key);
                const dirName = path.dirname(finalOutputPath);

                // Create directory if it doesn't exist
                if (!fs.existsSync(dirName)) {
                    fs.mkdirSync(dirName, { recursive: true });
                }

                const outputFile = fs.createWriteStream(finalOutputPath);

                const getObjectCommand = new GetObjectCommand({
                    Bucket: "devdep",
                    Key
                });

                const response = await s3.send(getObjectCommand);

                if (response.Body) {
                    const stream = response.Body as Readable;
                    await new Promise<void>((resolve, reject) => {
                        stream.pipe(outputFile)
                            .on("finish", () => {
                                console.log(`✅ Downloaded: ${Key}`);
                                resolve();
                            })
                            .on("error", (error) => {
                                console.error(`❌ Error downloading ${Key}:`, error.message);
                                reject(new Error(`Failed to download ${Key}: ${error.message}`));
                            });
                    });
                }
            } catch (error: any) {
                console.error(`❌ Error processing file ${Key}:`, error?.message || error);
                throw error;
            }
        });

        console.log("⏳ Downloading files...");
        await Promise.all(allPromises);
        console.log(`✅ All files downloaded successfully`);
    } catch (error: any) {
        console.error(`❌ Error downloading S3 folder: ${error?.message || error}`);
        throw new Error(`Failed to download S3 folder: ${error?.message || 'Unknown error'}`);
    }
}

export async function copyFinalDist(id: string, projectPath: string): Promise<void> {
    try {
        // Validation: Check if id is valid
        if (!id || typeof id !== 'string' || id.trim().length === 0) {
            throw new Error("Invalid deployment ID provided");
        }

        // Validation: Check if projectPath is valid
        if (!projectPath || typeof projectPath !== 'string' || projectPath.trim().length === 0) {
            throw new Error("Invalid project path provided");
        }

        let folderPath = path.join(projectPath, 'dist');
        if (!fs.existsSync(folderPath)) {
            folderPath = path.join(projectPath, 'build');
        }

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
            const relativePath = path
                .relative(folderPath, file)      // get relative path
                .split(path.sep)                 // split by OS separator
                .join("/");                      // force S3-style /

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

        const fileContent = fs.createReadStream(localFilePath);
        const upload = new Upload({
            client: s3,
            params: {
                Bucket: "devdep",
                Key: fileName,
                Body: fileContent,
            },
        });

        await upload.done();

        console.log(`✅ Uploaded file: ${fileName}`);
    } catch (error: any) {
        console.error(`❌ Error uploading file ${fileName}:`, error?.message || error);
        throw new Error(`Failed to upload file ${fileName}: ${error?.message || 'Unknown error'}`);
    }
}

export async function deleteS3Folder(id: string): Promise<void> {
    try {
        // Validation: Check if id is valid
        if (!id || typeof id !== 'string' || id.trim().length === 0) {
            throw new Error("Invalid deployment ID provided");
        }

        const prefix = `dist/${id}/`;
        console.log(`🗑️ Deleting S3 objects with prefix: ${prefix}...`);

        const listCommand = new ListObjectsV2Command({
            Bucket: "devdep",
            Prefix: prefix
        });

        // List all objects with the prefix
        const listResponse = await s3.send(listCommand);

        if (!listResponse.Contents || listResponse.Contents.length === 0) {
            console.log(`ℹ️ No files found in S3 with prefix: ${prefix}`);
            return;
        }

        console.log(`📦 Found ${listResponse.Contents.length} file(s) to delete`);

        // Prepare objects for deletion
        const objectsToDelete = listResponse.Contents.map(({ Key }) => ({ Key: Key! }));

        const deleteCommand = new DeleteObjectsCommand({
            Bucket: "devdep",
            Delete: {
                Objects: objectsToDelete,
                Quiet: false
            }
        });

        // Delete objects in batch (S3 supports up to 1000 objects per request)
        const deleteResponse = await s3.send(deleteCommand);

        console.log(`✅ Successfully deleted ${deleteResponse.Deleted?.length || 0} file(s) from S3`);

        if (deleteResponse.Errors && deleteResponse.Errors.length > 0) {
            console.warn(`⚠️ Failed to delete ${deleteResponse.Errors.length} file(s):`, deleteResponse.Errors);
        }
    } catch (error: any) {
        console.error(`❌ Error deleting S3 folder: ${error?.message || error}`);
        throw new Error(`Failed to delete S3 folder: ${error?.message || 'Unknown error'}`);
    }
}
