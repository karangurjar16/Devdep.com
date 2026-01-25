import { Router, Request, Response } from "express";
const router = Router();
import { client } from '../../config/redis';

router.post("/check", async (req, res) => {
    const { name } = req.body;
  
    if (!/^[a-z0-9-]{3,30}$/.test(name)) {
      return res.json({ available: false });
    }
  
    const exists = await client.exists(`domain:${name}`);
    res.json({ available: !exists });
  });
  

router.post("/reserve", async (req, res) => {
    const { id, name } = req.body;
  
    const success = await client.set(`domain:${name}`, id, { NX: true });
    if (!success) return res.status(409).json({ error: "Taken" });
  
    res.json({ success: true });
  });

router.get("/:id", async (req, res) => {
    const { id } = req.params;
  
    try {
      const domains: string[] = [];
      
      // Get all keys matching domain:* pattern
      const keys = await client.keys("domain:*");
  
      // Check each key's value
      for (const key of keys) {
        const value = await client.get(key);
        if (value === id) {
          // Extract domain name from key (remove "domain:" prefix)
          const domainName = key.replace("domain:", "");
          domains.push(domainName);
        }
      }
  
      res.json({ domains });
    } catch (error) {
      console.error("Error fetching domains:", error);
      res.status(500).json({ error: "Failed to fetch domains" });
    }
  });

  
export default router;
  