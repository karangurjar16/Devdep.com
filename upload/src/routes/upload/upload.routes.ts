import { Router, Request, Response } from "express";

import { generate } from "../../utils";

import path from "path";
const router = Router();
import { uploadFile, deleteS3Folder, stopPM2Process } from "../../aws";

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

    console.log(`[deploy:${id}] Step: set status -> Uploading`);
    await client.set(id, "Uploading");

    const repoUrl = `https://github.com/${repo.owner}/${repo.repo}`;
    const baseDir = path.join(__dirname, "output", id);
    console.log(`[deploy:${id}] Computed repoUrl/baseDir`, { repoUrl, baseDir });

    try {
        console.log(`[deploy:${id}] Step: saving deployment record to DB`);
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
        console.log(`[deploy:${id}] Step: set status -> Failed`);
        await client.set(id, "Failed");

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

        // Delete Redis status keys
        console.log(`[delete:${id}] Cleaning up Redis status keys...`);
        try {
            await client.del(id);
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
