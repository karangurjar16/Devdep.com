import { Router } from "express";
import type { Router as ExpressRouter } from "express";

import { generate } from "../../utils";

const router: ExpressRouter = Router();
import { deleteS3Folder, stopPM2Process } from "../../aws";

import { client } from '../../config/redis';
import { prisma } from "../../config/prisma";



router.post("/deploy", async (req, res) => {
    const repo = req.body;
    const id = generate();
    console.log(`[deploy:${id}] Request received`, {
        owner: repo?.owner,
        repo: repo?.repo,
        projectName: repo?.projectName,
        framework: repo?.framework,
        rootDir: repo?.rootDir,
    });

    // Set initial status — key is always `${id}:status`
    await client.set(`${id}:status`, "Queued");
    console.log(`[deploy:${id}] Status set to Queued`);

    const repoUrl = `https://github.com/${repo.owner}/${repo.repo}`;

    try {
        console.log(`[deploy:${id}] Saving deployment record to DB`);
        await prisma.deploy.create({
            data: {
                id,
                email: repo.owner,
                repoUrl,
                projectName: repo.projectName,
                framework: repo.framework,
                rootDir: repo.rootDir,
                env: repo.env || {}
            }
        });
        console.log(`[deploy:${id}] Deployment record saved`);

        await client.lPush("upload-queue", id);

        res.json({ id });
        console.log(`[deploy:${id}] Response sent`, { id });

    } catch (error) {
        console.error(`[deploy:${id}] Error during deploy`, error);
        await client.set(`${id}:status`, "Failed");
        res.status(500).json({ error: "Deployment failed" });
    }
});

router.get("/deploy/status/:id", async (req, res) => {
    const { id } = req.params;

    const status = await client.get(`${id}:status`);

    if (!status) {
        return res.status(404).json({ status: "not_found" });
    }

    res.json({ status });
});

router.get("/deploy/logs/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const logs = await client.lRange(`${id}:logs`, 0, -1);

        if (!logs || logs.length === 0) {
            return res.json({ logs: [] });
        }

        // Parse JSON strings back to objects
        const parsedLogs = logs.map(logStr => {
            try {
                return JSON.parse(logStr);
            } catch (e) {
                // Fallback for any improperly formatted logs
                return { stage: "Unknown", log: logStr, timestamp: new Date().toISOString() };
            }
        });

        res.json({ logs: parsedLogs });
    } catch (error: any) {
        console.error(`[logs:${id}] Error fetching logs:`, error?.message || error);
        res.status(500).json({ error: "Failed to fetch logs", details: error?.message });
    }
});

router.delete("/deploy/:id", async (req, res) => {
    const { id } = req.params;

    try {
        console.log(`[delete:${id}] Delete request received`);

        // Fetch project from database
        const project = await prisma.deploy.findUnique({
            where: { id }
        });

        if (!project) {
            console.log(`[delete:${id}] Project not found`);
            return res.status(404).json({ error: "Project not found" });
        }

        console.log(`[delete:${id}] Project found, framework: ${project.framework}`);

        // Handle cleanup based on framework type
        if (project.framework === "React") {
            console.log(`[delete:${id}] Deleting S3 files for React project...`);
            try {
                await deleteS3Folder(id);
                console.log(`[delete:${id}] S3 cleanup completed successfully`);
            } catch (error: any) {
                console.error(`[delete:${id}] Error cleaning up S3:`, error?.message || error);
                // Continue with deletion even if S3 cleanup fails
            }
        } else if (project.framework === "Node") {
            console.log(`[delete:${id}] Stopping PM2 process for Node project...`);
            try {
                const result = await stopPM2Process(id);
                console.log(`[delete:${id}] PM2 cleanup result: ${result.status}`);
            } catch (error: any) {
                console.error(`[delete:${id}] Error cleaning up PM2:`, error?.message || error);
                // Continue with deletion even if PM2 cleanup fails
            }
        }

        // Delete domain mappings from Redis
        console.log(`[delete:${id}] Cleaning up domain mappings...`);
        try {
            const domainKeys = await client.keys("domain:*");
            for (const key of domainKeys) {
                const value = await client.get(key);
                if (value === id) {
                    await client.del(key);
                    console.log(`[delete:${id}] Deleted domain mapping: ${key}`);
                }
            }
        } catch (error: any) {
            console.error(`[delete:${id}] Error cleaning up domains:`, error?.message || error);
            // Continue with deletion even if domain cleanup fails
        }

        // Delete Redis status and port keys
        console.log(`[delete:${id}] Cleaning up Redis keys...`);
        try {
            await client.del(`${id}:status`);
            await client.del(`${id}:Port`);
        } catch (error: any) {
            console.error(`[delete:${id}] Error cleaning up Redis keys:`, error?.message || error);
        }

        // Delete from database
        console.log(`[delete:${id}] Deleting from database...`);
        await prisma.deploy.delete({
            where: { id }
        });

        console.log(`[delete:${id}] Project deleted successfully`);
        res.json({ success: true, message: "Project deleted successfully" });

    } catch (error: any) {
        console.error(`[delete:${id}] Error during deletion:`, error?.message || error);
        res.status(500).json({ error: "Failed to delete project", details: error?.message });
    }
});

export default router;
