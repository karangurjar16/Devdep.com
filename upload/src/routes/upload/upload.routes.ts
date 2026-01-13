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
    await client.set(id, "Uploading");

    const repoUrl = `https://github.com/${repo.owner}/${repo.repo}`;
    const baseDir = path.join(__dirname, "output", id);

    try {
        await simpleGit().clone(repoUrl, baseDir);

        const files = getAllFiles(baseDir);

        for (const file of files) {
            const relativePath = path.relative(baseDir, file);
            const s3Key = `output/${id}/${relativePath.split(path.sep).join("/")}`;
            await uploadFile(s3Key, file);
        }

        await client.set(id, "Deploying");

       

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
        
        await client.lPush("upload-queue", id);

        res.json({ id });

    } catch (error) {
        await client.set(id, "Failed");

        res.status(500).json({ error: "Deployment failed" });
    }
});

router.get("/deploy/status/:id", async (req, res) => {
    const { id } = req.params;

    const status = await client.get(id);

    if (!status) {
        return res.status(404).json({ status: "not_found" });
    }

    res.json({ status });
});

export default router;