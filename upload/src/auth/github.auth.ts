import { Router, Request, Response } from "express";
import axios from "axios";

const router = Router();

router.get("/github", (_req: Request, res: Response) => {
  const url =
    `https://github.com/login/oauth/authorize` +
    `?client_id=${process.env.GITHUB_CLIENT_ID}` +
    `&redirect_uri=${process.env.GITHUB_CALLBACK_URL}` +
    `&scope=repo user`;

  res.redirect(url);
});

router.get("/github/callback", async (req: Request, res: Response) => {
  const code = req.query.code as string;

  if (!code) {
    return res.status(400).json({ message: "Code missing" });
  }

  try {
    const tokenResponse = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: process.env.GITHUB_CALLBACK_URL,
      },
      {
        headers: { Accept: "application/json" },
      }
    );

    const accessToken = tokenResponse.data.access_token;

    if (!accessToken) {
      return res.status(401).json({ message: "Token not received" });
    }

    // Simple cookie - works everywhere
    res.cookie("github_token", accessToken, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/"
    });

    // Simple redirect - use env variable or default
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    res.redirect(`${frontendUrl}/dashboard`);
  } catch (error: any) {
    console.error("OAuth callback error:", error?.message || error);
    res.status(500).json({ message: "OAuth failed" });
  }
});

export default router;
