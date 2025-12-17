import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import githubAuthRouter from "./auth/github.auth";
import githubRoutes from "./routes/github/github.routes";
// import deployRoutes from "./routes/deploy/deploy.routes";
import uploadRoutes from "./routes/upload/upload.routes";


dotenv.config();

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


app.get("/", (req, res) => {
  res.send("Hello World");
});
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
