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

  
export default router;
  