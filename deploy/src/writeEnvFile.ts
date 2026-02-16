import fs from "fs";
import path from "path";
import { EnvVariables } from "./types";

export function writeEnvFile(
    projectPath: string,
    envObject: EnvVariables | Record<string, string> | null | undefined
) {
    try {
        if (!fs.existsSync(projectPath)) {
            throw new Error(`Project path does not exist: ${projectPath}`);
        }

        const envLines: string[] = [];

        if (envObject && typeof envObject === "object") {
            for (const key of Object.keys(envObject)) {
                const value = envObject[key];
                if (value === null || value === undefined) continue;
                envLines.push(`${key}="${String(value)}"`);
            }
        }

        const envContent = envLines.join("\n") + "\n";
        const envFilePath = path.join(projectPath, ".env");

        fs.writeFileSync(envFilePath, envContent, { encoding: "utf-8" });

        console.log(`✅ Environment file created at: ${envFilePath}`);
    } catch (error: any) {
        throw new Error(`Failed to write .env file: ${error?.message || "Unknown error"}`);
    }
}
