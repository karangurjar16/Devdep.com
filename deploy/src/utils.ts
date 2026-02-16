import path from "path";
import fs from "fs";
import { execInDirectory, chainCommands } from "./config/commandRunner";

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
        console.log("📦 Dependencies downloading...");

        // Use the new command runner for OS-agnostic execution
        const result = await execInDirectory(
            projectPath,
            chainCommands(["npm install", "npm run build"])
        );

        console.log("✅ Building ended successfully");
        console.log(`📊 Build output: ${result.stdout}`);

        if (result.stderr) {
            console.warn(`⚠️ Build warnings: ${result.stderr}`);
        }

        return "Build completed successfully";
    } catch (error: any) {
        console.error(`❌ Error building project: ${error?.error || error?.message || error}`);
        throw new Error(`Failed to build project: ${error?.error || error?.message || 'Unknown error'}`);
    }
}
