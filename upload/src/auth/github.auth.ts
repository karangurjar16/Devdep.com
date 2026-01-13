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

    // Cookie configuration for production
    const isProduction = process.env.NODE_ENV === "production";
    
    // Determine frontend URL: try to get from referer, then env, then default
    let frontendUrl = process.env.FRONTEND_URL;
    
    // Try to extract frontend URL from referer header if available
    const referer = req.headers.referer;
    if (referer && !frontendUrl) {
      try {
        const refererUrl = new URL(referer);
        // Use the origin from referer (protocol + host + port)
        frontendUrl = refererUrl.origin;
      } catch {
        // If referer parsing fails, continue with default
      }
    }
    
    // Fallback to default if still not set
    if (!frontendUrl) {
      frontendUrl = isProduction 
        ? (process.env.FRONTEND_URL || "https://devdep.dpdns.org")
        : "http://localhost:5173";
    }
    
    // Ensure frontendUrl doesn't have trailing slash
    frontendUrl = frontendUrl.replace(/\/$/, "");
    
    res.cookie("github_token", accessToken, {
      httpOnly: true,
      sameSite: isProduction ? "none" : "lax", // "none" required for cross-origin in production
      secure: isProduction, // true in production (requires HTTPS)
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: "/",
      ...(isProduction && process.env.COOKIE_DOMAIN && { domain: process.env.COOKIE_DOMAIN }),
    });

    // Redirect to dashboard route
    const redirectUrl = `${frontendUrl}/dashboard`;
    console.log(`Redirecting to: ${redirectUrl}`);
    res.redirect(redirectUrl);
  } catch (error: any) {
    console.error("OAuth callback error:", error?.message || error);
    res.status(500).json({ message: "OAuth failed" });
  }
});

export default router;
