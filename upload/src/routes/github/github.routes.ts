import { Router, Request, Response } from "express";
import axios from "axios";

const router = Router();

/**
 * Get authenticated user's repositories (only repos the user themselves owns)
 */

router.get("/repos", async (req: Request, res: Response) => {
  // token read from cookie, fallback to Authorization header or ?token
  let token = req.cookies?.github_token as string | undefined;
  if (!token) {
    const authHeader = req.header("authorization");
    if (authHeader?.startsWith("Bearer ")) token = authHeader.replace("Bearer ", "");
  }
  if (!token && req.query?.token) {
    token = String(req.query.token);
  }

  if (!token) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
  };

  try {
    const userResp = await axios.get("https://api.github.com/user", { headers });
    const login = userResp.data?.login;
    if (!login) {
      return res.status(500).json({ message: "Failed to determine authenticated user" });
    }

    const reposResp = await axios.get("https://api.github.com/user/repos?per_page=100", {
      headers,
    });

    const owned = (reposResp.data || []).filter(
      (r: any) => r?.owner?.login === login
    );

    res.json(owned);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch repositories" });
  }
});

export default router;
