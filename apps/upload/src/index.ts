import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import githubAuthRouter from "./auth/github.auth";
import githubRoutes from "./routes/github/github.routes";
// import deployRoutes from "./routes/deploy/deploy.routes";
import uploadRoutes from "./routes/upload/upload.routes";
import doaminRoutes from "./routes/domain/domain.routes"

const app = express();

const allowedOrigins: string[] = ["http://localhost:5173"];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/$/, ""));
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      console.warn(`⚠️ CORS blocked request from origin: ${origin}`);
      return callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(cookieParser());

app.use("/auth", githubAuthRouter);
app.use("/github", githubRoutes);
// app.use("/deploy", deployRoutes);
app.use("/upload", uploadRoutes);
app.use("/domain", doaminRoutes)

app.get("/", (_req, res) => {
  res.send("Hello World");
});
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
