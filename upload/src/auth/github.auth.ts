import { Router, Request, Response } from "express";
import axios from "axios";
import crypto from "crypto";

const router = Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

function getFrontendUrl(): string {
  const isProduction = process.env.NODE_ENV === "production";
  return (
    process.env.FRONTEND_URL ||
    (isProduction ? "https://devdep.dpdns.org" : "http://localhost:5173")
  ).replace(/\/$/, "");
}

function getCookieOptions(isProduction: boolean) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
    domain: isProduction ? ".devdep.dpdns.org" : undefined,
    path: "/",
  };
}

// ─── Stateless HMAC state helpers (no cookie needed) ────────────────────────

function generateState(): string {
  const timestamp = Date.now().toString();
  const secret = process.env.GITHUB_CLIENT_SECRET || "fallback-secret";
  const hmac = crypto.createHmac("sha256", secret).update(timestamp).digest("hex");
  return `${timestamp}.${hmac}`;
}

function verifyState(state: string): boolean {
  try {
    const [timestamp, hmac] = state.split(".");
    if (!timestamp || !hmac) return false;

    // Reject tokens older than 10 minutes
    if (Date.now() - parseInt(timestamp) > 10 * 60 * 1000) return false;

    const secret = process.env.GITHUB_CLIENT_SECRET || "fallback-secret";
    const expected = crypto.createHmac("sha256", secret).update(timestamp).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ─── GET /auth/github — Start OAuth flow ────────────────────────────────────

router.get("/github", (_req: Request, res: Response) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const callbackUrl = process.env.GITHUB_CALLBACK_URL;

  if (!clientId || !callbackUrl) {
    console.error("❌ Missing GITHUB_CLIENT_ID or GITHUB_CALLBACK_URL env vars");
    return res.status(500).json({ message: "OAuth not configured" });
  }

  // Generate a stateless HMAC-signed state token (no cookie needed)
  const state = generateState();

  const url =
    `https://github.com/login/oauth/authorize` +
    `?client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
    `&scope=repo%20user` +
    `&state=${encodeURIComponent(state)}`;

  res.redirect(url);
});


// ─── GET /auth/github/callback — Handle OAuth callback ──────────────────────

router.get("/github/callback", async (req: Request, res: Response) => {
  const frontendUrl = getFrontendUrl();
  const isProduction = process.env.NODE_ENV === "production";

  const code = req.query.code as string;
  const returnedState = req.query.state as string;

  // Validate HMAC-signed state (no cookie needed)
  if (!returnedState || !verifyState(decodeURIComponent(returnedState))) {
    console.error("❌ OAuth state invalid or expired — possible CSRF attack");
    return res.redirect(`${frontendUrl}/?error=invalid_state`);
  }

  if (!code) {
    console.error("❌ OAuth callback missing code");
    return res.redirect(`${frontendUrl}/?error=missing_code`);
  }

  try {
    // Exchange code for access token
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
    const tokenError = tokenResponse.data.error;

    if (tokenError) {
      console.error(`❌ GitHub token error: ${tokenError} — ${tokenResponse.data.error_description}`);
      return res.redirect(`${frontendUrl}/?error=token_denied`);
    }

    if (!accessToken) {
      console.error("❌ GitHub did not return an access token");
      return res.redirect(`${frontendUrl}/?error=no_token`);
    }

    // Verify the token works by fetching the user
    const userResp = await axios.get("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (!userResp.data?.login) {
      console.error("❌ Could not verify GitHub user from token");
      return res.redirect(`${frontendUrl}/?error=invalid_token`);
    }

    console.log(`✅ GitHub OAuth successful for user: ${userResp.data.login}`);

    // Set the auth cookie
    res.cookie("github_token", accessToken, {
      ...getCookieOptions(isProduction),
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.redirect(`${frontendUrl}/dashboard`);
  } catch (error: any) {
    console.error("❌ OAuth callback error:", error?.message || error);
    res.redirect(`${frontendUrl}/?error=oauth_failed`);
  }
});

// ─── GET /auth/me — Return current authenticated user ───────────────────────

router.get("/me", async (req: Request, res: Response) => {
  const token = req.cookies?.github_token as string | undefined;

  if (!token) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const userResp = await axios.get("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    });

    const { login, name, avatar_url, email } = userResp.data;
    return res.json({ login, name, avatar_url, email });
  } catch (error: any) {
    // Token is invalid or expired
    const status = error?.response?.status;
    if (status === 401) {
      // Clear the stale cookie
      const isProduction = process.env.NODE_ENV === "production";
      res.clearCookie("github_token", getCookieOptions(isProduction));
      return res.status(401).json({ message: "Token expired or invalid" });
    }
    console.error("❌ /auth/me error:", error?.message || error);
    return res.status(500).json({ message: "Failed to fetch user" });
  }
});

// ─── POST /auth/logout — Clear auth cookie ──────────────────────────────────

router.post("/logout", (req: Request, res: Response) => {
  const isProduction = process.env.NODE_ENV === "production";
  res.clearCookie("github_token", getCookieOptions(isProduction));
  return res.json({ message: "Logged out successfully" });
});

export default router;
