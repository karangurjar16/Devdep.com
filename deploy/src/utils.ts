import path from "path";
import fs from "fs";
import { execInDirectory } from "./config/commandRunner";

export async function buildProject(projectPath: string): Promise<string> {
    try {
        // Validation: Check if projectPath is valid
        if (!projectPath || typeof projectPath !== 'string' || projectPath.trim().length === 0) {
            throw new Error("Invalid project path provided");
        }

        // Validation: Check if project directory exists
        if (!fs.existsSync(projectPath)) {
            throw new Error(`Project directory does not exist: ${projectPath}`);
        }

        // Validation: Check if package.json exists
        const packageJsonPath = path.join(projectPath, "package.json");
        if (!fs.existsSync(packageJsonPath)) {
            throw new Error(`package.json not found at: ${packageJsonPath}`);
        }

        console.log(`📁 Building project at: ${projectPath}`);

        // ── Step 1: Install dependencies ────────────────────────────────────
        console.log("📦 Installing dependencies...");
        const installResult = await execInDirectory(projectPath, "npm install");
        if (installResult.stderr) {
            console.warn(`⚠️ Install warnings: ${installResult.stderr}`);
        }
        console.log("✅ Dependencies installed");

        // ── Step 2: Build with increased heap memory ─────────────────────────
        // Vite/webpack builds can exceed the default 512 MB Node.js heap on
        // low-memory servers — bump it to 1536 MB to prevent OOM crashes.
        console.log("🔨 Building project (NODE_OPTIONS=--max-old-space-size=1536)...");
        const buildResult = await execInDirectory(
            projectPath,
            "NODE_OPTIONS=--max-old-space-size=1536 npm run build"
        );

        console.log("✅ Build completed successfully");
        if (buildResult.stdout) {
            console.log(`📊 Build output: ${buildResult.stdout}`);
        }
        if (buildResult.stderr) {
            console.warn(`⚠️ Build warnings: ${buildResult.stderr}`);
        }

        return "Build completed successfully";
    } catch (error: any) {
        console.error(`❌ Error building project: ${error?.error || error?.message || error}`);
        throw new Error(`Failed to build project: ${error?.error || error?.message || 'Unknown error'}`);
    }
}

