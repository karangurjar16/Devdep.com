import express from "express";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import "dotenv/config";
import mime from "mime-types";
import { LRUCache } from "lru-cache";
import { client } from "./redis";
import { createProxyServer } from "http-proxy";
import http from "http";
import https from "https";
import { Readable } from "stream";

const app = express();

// ─── HTTP keep-alive agent for proxy (reuses TCP connections to PM2 processes)
const keepAliveAgent = new http.Agent({ keepAlive: true, maxSockets: 64 });
const proxy = createProxyServer({ agent: keepAliveAgent });

proxy.on("error", (err, _req, res: any) => {
  console.error("Proxy error:", err.message);
  if (!res.headersSent) res.status(502).send("Bad gateway");
});

// ─── S3 / R2 client
const s3 = new S3Client({
  region: "auto",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
  endpoint: process.env.R2_ENDPOINT,
  // Node.js v3 client uses standard agents or undici. For simplicity and performance:
  // @ts-ignore
  requestHandler: {
    httpsAgent: new https.Agent({ keepAlive: true, maxSockets: 32 }),
  },
});

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: any[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// ─── In-process caches (avoids hitting remote Redis on every request)

// File content cache: key → Buffer (1 hour TTL, max 500 files)
const fileCache = new LRUCache<string, Buffer>({
  max: 500,
  ttl: 1000 * 60 * 60,
});

// Domain → project-id cache (5 min TTL — refreshes if domain mapping changes)
const domainCache = new LRUCache<string, string>({
  max: 1000,
  ttl: 1000 * 60 * 5,
});

// Project-id → port cache (5 min TTL — refreshes if process restarts)
const portCache = new LRUCache<string, string>({
  max: 1000,
  ttl: 1000 * 60 * 5,
});

// ─── Helper: resolve subdomain → { id, port } with minimal Redis round-trips
async function resolveProject(
  sub: string
): Promise<{ id: string; port: string | undefined }> {
  // 1. Resolve domain → id (check in-process cache first)
  let id = domainCache.get(sub);
  if (!id) {
    const redisId = await client.get(`domain:${sub}`);
    id = redisId ?? sub; // fallback: subdomain IS the id
    domainCache.set(sub, id);
  }

  // 2. Resolve id → port (check in-process cache first)
  let port = portCache.get(id);
  if (port === undefined) {
    const redisPort = await client.get(`${id}:Port`);
    port = redisPort ?? undefined;
    if (port !== undefined) portCache.set(id, port);
  }

  return { id, port };
}

// ─── Main request handler
app.use(async (req, res) => {
  try {
    const host = req.hostname;
    const sub = host.split(".")[0];

    const { id, port } = await resolveProject(sub);

    // ── Backend project → proxy to PM2 process
    if (port) {
      return proxy.web(req, res, { target: `http://127.0.0.1:${port}` });
    }

    // ── Static (React/Next) project → serve from R2 via file cache
    let filePath = decodeURIComponent(req.path);
    if (filePath === "/" || (!filePath.includes(".") && !filePath.startsWith("/static"))) {
      filePath = "/index.html";
    }

    const key = `dist/${id}${filePath}`;

    // 1) RAM cache hit — zero latency
    const cached = fileCache.get(key);
    if (cached) {
      const contentType = mime.lookup(filePath) || "application/octet-stream";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      return res.send(cached);
    }

    // 2) Fetch from R2 (TCP connection reused via keep-alive agent)
    const command = new GetObjectCommand({ Bucket: "devdep", Key: key });
    const response = await s3.send(command);

    if (!response.Body) {
      throw new Error("Empty response body from R2");
    }

    const body = await streamToBuffer(response.Body as Readable);
    fileCache.set(key, body);

    const contentType = mime.lookup(filePath) || "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.send(body);
  } catch (err: any) {
    // NoSuchKey → 404, anything else → 500
    if (err?.code === "NoSuchKey") {
      return res.status(404).send("Not found");
    }
    console.error("Request error:", err?.message || err);
    res.status(500).send("Internal server error");
  }
});

app.listen(9000, () => {
  console.log("Request server running on port 9000");
});
