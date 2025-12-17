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
    const repoUrl = `https://github.com/${repo.owner}/${repo.repo}`;
    const baseDir = path.join(__dirname, "output", id);

    await simpleGit().clone(repoUrl, baseDir);

    const files = getAllFiles(baseDir);

    for (const file of files) {
        const relativePath = path.relative(baseDir, file);

        const s3Key = `output/${id}/${relativePath.split(path.sep).join("/")}`;

        await uploadFile(s3Key, file);
    }

    await client.lPush("upload-queue", id);

    await prisma.deploy.create({
        data: {
            id,
            email: repo.owner,
            repoUrl: repoUrl,
            projectName: repo.projectName,
            framework: repo.framework,
            rootDir: repo.rootDir
        }
    });


    await new Promise((resolve) => setTimeout(resolve, 5000))

    res.json({
        id: id
    })

});
export default router;