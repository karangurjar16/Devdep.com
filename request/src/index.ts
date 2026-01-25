import express from "express";
import { S3 } from "aws-sdk";
import "dotenv/config";
import mime from "mime-types";
import { LRUCache } from "lru-cache";
import { client } from './redis'
import { createProxyServer } from "http-proxy";

const app = express();
const proxy = createProxyServer({});
const s3 = new S3({
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  endpoint: process.env.R2_ENDPOINT,
  region: "auto",
  signatureVersion: "v4"
});


const fileCache = new LRUCache<string, Buffer>({
  max: 500,
  ttl: 1000 * 60 * 60
});

app.use(async (req, res) => {
  try {
    const host = req.hostname;
    const sub = host.split(".")[0];

    // Step 1: Resolve custom domain → project id
    let id = await client.get(`domain:${sub}`);
    if (!id) id = sub; // fallback to raw id
    const port = await client.get(`${id}:Port`);
    if (port) {
      // BACKEND → proxy to PM2 service
      return proxy.web(req, res, {
        target: `http://127.0.0.1:${port}`
      });
    }

    let filePath = decodeURIComponent(req.path);

    if (filePath === "/" || (!filePath.includes(".") && !filePath.startsWith("/static"))) {
      filePath = "/index.html";
    }

    const key = `dist/${id}${filePath}`;

    // 1) Serve from RAM cache first
    const cached = fileCache.get(key);
    if (cached) {
      const contentType = mime.lookup(filePath) || "application/octet-stream";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      return res.send(cached);
    }

    // 2) Fetch from R2
    const object = await s3.getObject({
      Bucket: "devdep",
      Key: key
    }).promise();

    const body = object.Body as Buffer;

    // 3) Store in cache
    fileCache.set(key, body);

    const contentType = mime.lookup(filePath) || "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.send(body);

  } catch (err) {
    console.error("Static fetch error:", err);
    res.status(404).send("File not found");
  }
});


app.listen(9000, () => {
  console.log("Frontend static router running on port 3001");
});
