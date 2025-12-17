import { Router, Request, Response } from "express";
import axios from "axios";
import { prisma } from "../../config/prisma";

const router = Router();

/**
 * Get authenticated user's repositories
 */
router.get("/repos", async (req: Request, res: Response) => {
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

    const reposResp = await axios.get(
      "https://api.github.com/user/repos?per_page=100",
      { headers }
    );

    const owned = (reposResp.data || []).filter(
      (r: any) => r?.owner?.login === login
    );

    res.json(owned);
  } catch {
    res.status(500).json({ message: "Failed to fetch repositories" });
  }
});

/**
 * Get deploys for authenticated user (NO owner in URL)
 */
router.get("/deploy", async (req: Request, res: Response) => {
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

    const deploys = await prisma.deploy.findMany({
      where: {
        email: login, 
      },
    });

    res.json(deploys);
  } catch {
    res.status(500).json({ message: "Failed to fetch deploys" });
  }
});

export default router;
