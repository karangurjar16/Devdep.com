import { Router, Request, Response } from "express";
import axios from "axios";
import { generate } from "../../utils";
import { getAllFiles } from "../../utils";
import simpleGit from "simple-git";
import path from "path";
const router = Router();
import { uploadFile } from "../../aws";

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
        console.log(`[deploy:${id}] Step: cloning repo`);
        await simpleGit().clone(repoUrl, baseDir);
        console.log(`[deploy:${id}] Clone completed`);

        console.log(`[deploy:${id}] Step: collecting files`);
        const files = getAllFiles(baseDir);
        console.log(`[deploy:${id}] Files discovered`, { count: files.length });

        console.log(`[deploy:${id}] Step: uploading files to S3`);
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const relativePath = path.relative(baseDir, file);
            const s3Key = `output/${id}/${relativePath.split(path.sep).join("/")}`;
            console.log(`[deploy:${id}] Uploading file ${i + 1}/${files.length}`, { s3Key });
            await uploadFile(s3Key, file);
        }
        console.log(`[deploy:${id}] All files uploaded`);

        console.log(`[deploy:${id}] Step: set status -> Deploying`);
        await client.set(id, "Deploying");

       

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
        
        console.log(`[deploy:${id}] Step: push to upload queue`);
        await client.lPush("upload-queue", id);
        console.log(`[deploy:${id}] Queued`, { queue: "upload-queue" });

        console.log(`[deploy:${id}] Step: responding to client`);
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

export default router;