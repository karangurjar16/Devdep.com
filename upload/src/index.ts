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

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
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

app.get("/", (req, res) => {
  res.send("Hello World");
});
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
