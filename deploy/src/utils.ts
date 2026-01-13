import { exec, spawn } from "child_process";
import path from "path";
import fs from "fs";

export function buildProject(id: string): Promise<string> {
    return new Promise((resolve, reject) => {
        try {
            // Validation: Check if id is valid
            if (!id || typeof id !== 'string' || id.trim().length === 0) {
                return reject(new Error("Invalid project ID provided"));
            }

            const projectPath = path.join(__dirname, `output/${id}`);

            // Validation: Check if project directory exists
            if (!fs.existsSync(projectPath)) {
                return reject(new Error(`Project directory does not exist: ${projectPath}`));
            }

            // Validation: Check if package.json exists
            const packageJsonPath = path.join(projectPath, "package.json");
            if (!fs.existsSync(packageJsonPath)) {
                return reject(new Error(`package.json not found at: ${packageJsonPath}`));
            }

            console.log(`📁 Building project at: ${projectPath}`);
            console.log("📦 Dependencies downloading...");

            const child = exec(`cd "${projectPath}" && npm install && npm run build`, {
                cwd: projectPath
            });

            child.stdout?.on('data', function(data) {
                console.log('stdout: ' + data);
            });

            child.stderr?.on('data', function(data) {
                console.log('stderr: ' + data);
            });

            child.on('error', function(error) {
                console.error(`❌ Build process error: ${error.message}`);
                reject(new Error(`Build process failed: ${error.message}`));
            });

            child.on('close', function(code) {
                if (code === 0) {
                    console.log("✅ Building ended successfully");
                    resolve("Build completed successfully");
                } else {
                    console.error(`❌ Build process exited with code: ${code}`);
                    reject(new Error(`Build process failed with exit code: ${code}`));
                }
            });

        } catch (error: any) {
            console.error(`❌ Error starting build process: ${error?.message || error}`);
            reject(new Error(`Failed to start build: ${error?.message || 'Unknown error'}`));
        }
    });
}