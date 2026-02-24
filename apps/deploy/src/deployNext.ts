import fs from "fs";
import path from "path";
import { spawnInDirectory } from "./config/commandRunner";
import { getFreePort } from "./portManager";
import { startWithPM2 } from "./pm2Runner";
import { writeEnvFile } from "./writeEnvFile";
import { client } from "@repo/redis";
import { DeployProject } from "@repo/shared";
import { getEntryFile } from "./utils/parseStartScript";
import { publishLog } from "./utils";

export async function deployNextProject(id: string, projectPath: string, project: DeployProject) {
    try {
        // Validation: Check required parameters
        if (!id || typeof id !== 'string' || id.trim().length === 0) {
            throw new Error("Invalid deployment ID provided");
        }

        if (!projectPath || typeof projectPath !== 'string' || projectPath.trim().length === 0) {
            throw new Error("Invalid project path provided");
        }

        // Validation: Check if project directory exists
        if (!fs.existsSync(projectPath)) {
            throw new Error(`Project directory does not exist: ${projectPath}`);
        }

        console.log(`📁 Project path: ${projectPath}`);

        // Read and validate package.json
        let pkg: any;
        const packageJsonPath = path.join(projectPath, "package.json");
        try {
            if (!fs.existsSync(packageJsonPath)) {
                throw new Error(`package.json not found at: ${packageJsonPath}`);
            }

            const packageJsonContent = fs.readFileSync(packageJsonPath, "utf-8");
            pkg = JSON.parse(packageJsonContent);
            console.log(`✅ package.json loaded successfully`);
        } catch (error: any) {
            throw new Error(`Failed to read or parse package.json: ${error?.message || 'Unknown error'}`);
        }

        // Install dependencies
        try {
            console.log("📦 Dependencies downloading...");
            await publishLog(id, "Dependencies Download", "Installing Next.js dependencies...");
            await spawnInDirectory(projectPath, "npm", ["install"], (logLine) => {
                publishLog(id, "Dependencies Download", logLine);
            });
            console.log("✅ Dependencies installed successfully");
            await publishLog(id, "Dependencies Download", "Dependencies installed successfully.");
        } catch (error: any) {
            await publishLog(id, "Dependencies Download", `Error installing dependencies: ${error?.error || error?.message || 'Unknown error'}`);
            throw new Error(`Failed to install dependencies: ${error?.error || error?.message || 'Unknown error'}`);
        }

        // Get free port
        let port: number;
        try {
            console.log("🔌 Allocating free port...");
            port = getFreePort();
            console.log(`✅ Port ${port} allocated successfully`);
        } catch (error: any) {
            throw new Error(`Failed to allocate port: ${error?.message || 'Unknown error'}`);
        }

        // Create .env from DB row (WITH PORT)
        try {
            console.log("📝 Creating environment file...");
            writeEnvFile(projectPath, {
                ...(project.env || {}),
                PORT: String(port),
                NODE_ENV: "production"
            });
        } catch (error: any) {
            throw new Error(`Failed to create environment file: ${error?.message || 'Unknown error'}`);
        }

        // Build project if build script exists
        if (!pkg.scripts?.build || !pkg.scripts?.start) {
            throw new Error("Next.js project must have both build and start scripts");
        }
        try {
            await client.set(`${id}:status`, "Building");
            console.log("🔨 Building started...");
            await publishLog(id, "Building", "Building Next.js project...");
            await spawnInDirectory(projectPath, "npm", ["run", "build"], (logLine) => {
                publishLog(id, "Building", logLine);
            });
            console.log("✅ Building ended successfully");
            await publishLog(id, "Building", "Build completed successfully.");
        } catch (error: any) {
            await publishLog(id, "Building", `Build failed: ${error?.error || error?.message || 'Unknown error'}`);
            throw new Error(`Build failed: ${error?.error || error?.message || 'Unknown error'}`);
        }


        // Detect entry file
        console.log("🔍 Detecting entry file...");
        const entryFile = getEntryFile(projectPath, pkg, "NEXT");
        console.log(`✅ Entry file detected: ${entryFile}`);

        // Start with PM2
        await client.set(`${id}:status`, "Deploying");
        console.log("🚀 Starting application with PM2...");
        await publishLog(id, "Deploying", `Starting Next.js application with PM2 on port ${port}...`);
        const result = await startWithPM2(id, projectPath, port, "NEXT", pkg, entryFile);

        if (result.status === "failed") {
            await publishLog(id, "Deploying", `PM2 startup failed: ${result.error || 'Unknown error'}`);
            throw new Error(`PM2 startup failed: ${result.error || 'Unknown error'}`);
        }

        console.log(`✅ Application started successfully with PM2`);
        await publishLog(id, "Deploying", "Next.js application started successfully securely with PM2.");

        return {
            port,
            pm2Name: id,
            url: `http://localhost:${port}`,
            status: "deployed"
        };
    } catch (error: any) {
        console.error(`❌ Error deploying Node.js project: ${error?.message || error}`);
        throw error;
    }
}