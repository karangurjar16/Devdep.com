import { S3 } from "aws-sdk";
import fs from "fs";

const s3 = new S3({
    accessKeyId: "ea4bac46297743cadc6b5100c889f01f",
    secretAccessKey: "ae5ac388e2ca22ae37927056d1d51896bb2a1ddd75badce12fd2c4de9a3f51b4",
    endpoint: "https://5cd0f10c18c85b5b1eb72d39295a6ecf.r2.cloudflarestorage.com"
})

// fileName => output/12312/src/App.jsx
// filePath => /Users/harkiratsingh/vercel/dist/output/12312/src/App.jsx
export const uploadFile = async (fileName: string, localFilePath: string) => {
    const fileContent = fs.readFileSync(localFilePath);
    const response = await s3.upload({
        Body: fileContent,
        Bucket: "devdep",
        Key: fileName,
    }).promise();
    console.log(response);
}