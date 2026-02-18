import 'dotenv/config';
import { copyFinalDist, downloadS3Folder } from './config/aws';
import { client } from './config/redis'
import { buildProject } from './utils';
import { pool } from './config/db';
import { deployNodeProject } from './deployNode';
import { DeployProject } from './types';
import path from 'path';
import simpleGit from 'simple-git';
import { deployNextProject } from './deployNext';
import fs from 'fs';

async function main() {
    try {
        console.log("🚀 Deployment service starting...");
        console.log("📊 Database connection initialized");

        while (true) {
            try {
                console.log("⏳ Waiting for deployment job in queue...");
                const res = await client.brPop("upload-queue", 0);

                // @ts-ignore
                const id = res?.element;

                // Validation: Check if id exists and is valid
                if (!id || typeof id !== 'string' || id.trim().length === 0) {
                    console.warn("⚠️ Invalid or empty deployment ID received, skipping...");
                    continue;
                }

                console.log(`📦 Processing deployment ID: ${id}`);
                console.log("--------------------------------------------------");

                // Fetch project from database
                let project: DeployProject | null = null;
                try {
                    console.log(`🔍 Fetching project details for ID: ${id}...`);
                    const result = await pool.query('SELECT * FROM "Deploy" WHERE id = $1', [id]);

                    if (result.rows.length === 0) {
                        console.error(`❌ Deploy not found for id: ${id}`);
                        await client.set(`${id}:status`, "Failed");
                        continue;
                    }

                    project = result.rows[0];
                    console.log(`✅ Project found: ${project?.framework || 'Unknown'} framework`);
                } catch (err: any) {
                    console.error(`❌ Error loading deploy row for id ${id}:`, err?.message || err);
                    await client.set(`${id}:status`, "Failed");
                    continue;
                }

                // Validation: Check if project has required fields
                if (!project || !project.framework) {
                    console.error(`❌ Invalid project data: missing framework for id ${id}`);
                    await client.set(`${id}:status`, "Failed");
                    continue;
                }

                // At this point, project is guaranteed to be non-null
                const validProject: DeployProject = project;

                console.log("--------------------------------------------------");

                // Clone repository from Git
                let projectPath: string;
                try {
                    console.log(`📥 Cloning repository for ID: ${id}...`);
                    console.log(`🔗 Repository URL: ${validProject.repoUrl}`);
                    const baseDir = path.join(__dirname, "output", id);

                    await client.set(`${id}:status`, "Cloning");
                    await simpleGit().clone(validProject.repoUrl, baseDir);
                    console.log(`✅ Repository cloned successfully to: ${baseDir}`);

                    // Calculate project path based on rootDir
                    if (validProject.rootDir && validProject.rootDir.trim().length > 0) {
                        projectPath = path.join(baseDir, validProject.rootDir);
                        console.log(`📂 Using rootDir: ${validProject.rootDir}`);

                        // Validation: Check if rootDir exists
                        if (!fs.existsSync(projectPath)) {
                            throw new Error(`Root directory does not exist: ${projectPath}`);
                        }
                    } else {
                        projectPath = baseDir;
                    }
                    console.log(`📁 Project path: ${projectPath}`);
                } catch (err: any) {
                    console.error(`❌ Error cloning repository for id ${id}:`, err?.message || err);
                    await client.set(`${id}:status`, "Failed");
                    continue;
                }

                console.log("--------------------------------------------------");

                // Process based on framework
                if (validProject.framework === "React") {
                    try {
                        console.log(`⚛️ React project detected, starting build process...`);
                        await client.set(`${id}:status`, "Building");
                        await buildProject(projectPath);
                        console.log("✅ Build completed successfully");

                        await client.set(`${id}:status`, "Deploying");
                        console.log(`📤 Uploading final distribution for ID: ${id}...`);
                        await copyFinalDist(id, projectPath);
                        console.log(`✅ Distribution uploaded successfully for ID: ${id}`);
                    } catch (err: any) {
                        console.error(`❌ Error building React project for id ${id}:`, err?.message || err);
                        await client.set(`${id}:status`, "Failed");
                        continue;
                    }
                } else if (validProject.framework === "Node") {
                    try {
                        console.log(`🟢 Node.js project detected, starting deployment...`);
                        await client.set(`${id}:status`, "Deploying");
                        const result = await deployNodeProject(id, projectPath, validProject);
                        console.log(`✅ Node.js deployment completed. Port: ${result.port}`);
                        await client.set(`${id}:Port`, result.port);
                    } catch (err: any) {
                        console.error(`❌ Error deploying Node.js project for id ${id}:`, err?.message || err);
                        await client.set(`${id}:status`, "Failed");
                        continue;
                    }
                } else if (validProject.framework === "Next.js") {
                    try {
                        console.log(`🟣 Next.js project detected, starting deployment...`);
                        await client.set(`${id}:status`, "Deploying");
                        const result = await deployNextProject(id, projectPath, validProject);
                        console.log(`✅ Next.js deployment completed. Port: ${result.port}`);
                        await client.set(`${id}:Port`, result.port);
                    } catch (err: any) {
                        console.error(`❌ Error deploying Next.js project for id ${id}:`, err?.message || err);
                        await client.set(`${id}:status`, "Failed");
                        continue;
                    }
                } else {
                    console.error(`❌ Unsupported framework: ${validProject.framework} for id ${id}`);
                    await client.set(`${id}:status`, "Failed");
                    continue;
                }

                // Mark deployment as complete
                await client.set(`${id}:status`, "Deployed");
                console.log(`🎉 Deployment completed successfully for ID: ${id}`);

                console.log("--------------------------------------------------");
            } catch (err: any) {
                console.error("❌ Unexpected error in deployment loop:", err?.message || err);
                // Continue to next iteration instead of crashing
                await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retrying
            }
        }
    } catch (err: any) {
        console.error("❌ Fatal error in main function:", err?.message || err);
        process.exit(1);
    }
}

// Start the application with error handling
main().catch((err: any) => {
    console.error("❌ Fatal error starting application:", err?.message || err);
    process.exit(1);
});