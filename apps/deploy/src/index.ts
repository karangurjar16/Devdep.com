import 'dotenv/config';
import { copyFinalDist, deployStaticSite } from './config/aws';
import { client } from "@repo/redis"
import { buildProject, publishLog } from './utils';
import { pool } from './config/db';
import { deployNodeProject } from './deployNode';
import { DeployProject } from "@repo/shared";
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

                const baseDir = path.join(__dirname, "output", id);
                let projectPath: string = baseDir;

                try {
                    // Clone repository from Git
                    console.log(`📥 Cloning repository for ID: ${id}...`);
                    console.log(`🔗 Repository URL: ${validProject.repoUrl}`);

                    await client.set(`${id}:status`, "Cloning");
                    await publishLog(id, "Cloning", `Cloning repository ${validProject.repoUrl}...`);

                    // Ensure baseDir is completely empty before cloning to avoid simple-git crash
                    if (fs.existsSync(baseDir)) {
                        console.log(`🧹 Cleaning up existing directory before cloning: ${baseDir}`);
                        fs.rmSync(baseDir, { recursive: true, force: true });
                    }

                    const git = simpleGit();

                    await git.clone(validProject.repoUrl, baseDir, ['--depth', '1', '--single-branch']);
                    console.log(`✅ Repository cloned successfully to: ${baseDir}`);
                    await publishLog(id, "Cloning", `Repository cloned successfully.`);

                    await client.set(`${id}:status`, "Dependencies Download");

                    // Calculate project path based on rootDir
                    if (validProject.rootDir && validProject.rootDir.trim().length > 0) {
                        projectPath = path.join(baseDir, validProject.rootDir);
                        console.log(`📂 Using rootDir: ${validProject.rootDir}`);

                        // Validation: Check if rootDir exists
                        if (!fs.existsSync(projectPath)) {
                            throw new Error(`Root directory does not exist: ${projectPath}`);
                        }
                    }

                    console.log(`📁 Project path: ${projectPath}`);
                    console.log("--------------------------------------------------");

                    // Process based on framework
                    if (validProject.framework === "React") {
                        console.log(`⚛️ React project detected, starting build process...`);
                        await buildProject(id, projectPath);
                        console.log("✅ Build completed successfully");

                        await client.set(`${id}:status`, "Deploying");
                        console.log(`📤 Uploading final distribution for ID: ${id}...`);
                        await publishLog(id, "Deploying", "Uploading final distribution to S3...");
                        await copyFinalDist(id, projectPath);
                        console.log(`✅ Distribution uploaded successfully for ID: ${id}`);
                        await publishLog(id, "Deploying", "Distribution uploaded successfully");

                        console.log(`🧹 Cleaning up React build files for ID: ${id}`);
                        await publishLog(id, "Deploying", "Cleaning up React build files...");
                        fs.rmSync(baseDir, { recursive: true, force: true });
                        await publishLog(id, "Deploying", "Cleanup completed");

                    } else if (validProject.framework === "Node") {
                        console.log(`🟢 Node.js project detected, starting deployment...`);
                        const result = await deployNodeProject(id, projectPath, validProject);
                        console.log(`✅ Node.js deployment completed. Port: ${result.port}`);
                        await client.set(`${id}:Port`, result.port);
                    } else if (validProject.framework === "Next.js") {
                        console.log(`🟣 Next.js project detected, starting deployment...`);
                        const result = await deployNextProject(id, projectPath, validProject);
                        console.log(`✅ Next.js deployment completed. Port: ${result.port}`);
                        await client.set(`${id}:Port`, result.port);
                    } else if (validProject.framework === "Static") {
                        console.log(`📄 Static site detected, uploading files to S3...`);
                        await client.set(`${id}:status`, "Deploying");
                        await publishLog(id, "Deploying", "Uploading static files to S3...");
                        await deployStaticSite(id, projectPath);
                        await publishLog(id, "Deploying", "Static files uploaded successfully.");

                        console.log(`🧹 Cleaning up static site files for ID: ${id}`);
                        await publishLog(id, "Deploying", "Cleaning up local files...");
                        fs.rmSync(baseDir, { recursive: true, force: true });
                        await publishLog(id, "Deploying", "Cleanup completed");
                    } else {
                        throw new Error(`Unsupported framework: ${validProject.framework}`);
                    }

                    // Mark deployment as complete
                    await client.set(`${id}:status`, "Deployed");
                    console.log(`🎉 Deployment completed successfully for ID: ${id}`);
                    await publishLog(id, "Deploying", "Deployment completed successfully! 🎉");

                } catch (err: any) {
                    console.error(`❌ Deployment failed for ID ${id}:`, err?.message || err);
                    await client.set(`${id}:status`, "Failed");
                    await publishLog(id, Object.keys(err).length > 0 ? "Deploying" : "Failed", `Deployment failed: ${err?.message || err}`);

                    // Cleanup files on failure
                    if (fs.existsSync(baseDir)) {
                        console.log(`🧹 Cleaning up failed deployment files at: ${baseDir}`);
                        try {
                            fs.rmSync(baseDir, { recursive: true, force: true });
                            console.log(`✅ Cleanup successful`);
                        } catch (cleanupErr: any) {
                            console.error(`⚠️ Cleanup failed:`, cleanupErr?.message || cleanupErr);
                        }
                    }
                }

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