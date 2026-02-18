import fs from "fs";
import path from "path";
import { execCommand, execInDirectory, execWithEnv, chainCommands, buildCdCommand } from "./config/commandRunner";

export type ProjectType = "NODE" | "NEXT";

export async function startWithPM2(
  id: string,
  projectPath: string,
  port: number,
  projectType: ProjectType = "NODE",
  pkg?: any,
  entryFile?: string
) {
  const name = id;

  try {
    // Validation: Check required parameters
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new Error("Invalid deployment ID provided");
    }

    if (!projectPath || typeof projectPath !== 'string' || projectPath.trim().length === 0) {
      throw new Error("Invalid project path provided");
    }

    if (!port || typeof port !== 'number' || port < 1 || port > 65535) {
      throw new Error(`Invalid port number: ${port}`);
    }

    // Validation: Check if project path exists
    if (!fs.existsSync(projectPath)) {
      throw new Error(`Project path does not exist: ${projectPath}`);
    }

    // Validation: Check if entry file is provided
    if (!entryFile) {
      throw new Error("Entry file must be provided");
    }

    console.log(`🔧 Initializing PM2 daemon...`);

    // 1. Ensure PM2 daemon is running
    try {
      await execCommand("pm2", ["ping"]);
      console.log(`✅ PM2 daemon is running`);
    } catch (pingError) {
      console.log(`⚠️ PM2 daemon not responding, attempting to resurrect...`);
      try {
        await execCommand("pm2", ["resurrect"]);
        console.log(`✅ PM2 daemon resurrected`);
      } catch (resurrectError: any) {
        console.warn(`⚠️ Could not resurrect PM2 daemon: ${resurrectError?.error || 'Unknown error'}`);
      }
    }

    // 2. Delete existing process with same name (if any)
    console.log(`🗑️ Cleaning up existing process with name: ${name}...`);
    try {
      await execCommand("pm2", ["delete", name]);
      console.log(`✅ Existing process deleted`);
    } catch (deleteError) {
      // Ignore error if process doesn't exist
      console.log(`ℹ️ No existing process found with name: ${name}`);
    }

    // 3. Start with correct PORT env based on project type and entry file
    let result;

    console.log(`🚀 Starting ${projectType} application with PM2 on port ${port}...`);
    console.log(`📝 Entry file: ${entryFile}`);

    // Check if this is a Next.js project that needs npm start
    if (entryFile === 'NEXT_START') {
      // Next.js project - use npm start
      console.log(`ℹ️ Using npm start for Next.js project`);

      // Build the command chain: cd to directory, set env vars, and run pm2
      const cdCommand = buildCdCommand(projectPath);
      const envCommands = [
        `set PORT=${port}`,
        `set NODE_ENV=production`
      ];
      // Use npm.cmd on Windows to avoid PM2 trying to execute the batch file directly
      const npmExecutable = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      const pm2Command = `pm2 start ${npmExecutable} --name ${name} -- start`;

      result = await execCommand(
        chainCommands([cdCommand, ...envCommands, pm2Command])
      );
    } else {
      // Standard Node.js project - start with the detected entry file
      console.log(`ℹ️ Using entry file: ${entryFile}`);

      result = await execInDirectory(
        projectPath,
        chainCommands([
          `set PORT=${port}`,
          `set NODE_ENV=production`,
          `pm2 start ${entryFile} --name ${name}`
        ])
      );
    }

    console.log(`✅ Application started successfully with PM2`);

    console.log(`📊 PM2 Output: ${result.stdout}`);

    if (result.stderr) {
      console.warn(`⚠️ PM2 Warnings: ${result.stderr}`);
    }

    return {
      status: "started",
      process: name,
      port,
      stdout: result.stdout,
      stderr: result.stderr
    };
  } catch (err: any) {
    console.error(`❌ PM2 startup failed: ${err?.error || err?.message || 'Unknown error'}`);
    return {
      status: "failed",
      process: name,
      port,
      error: err?.error || err?.message || "Unknown PM2 failure",
      stdout: err?.stdout || "",
      stderr: err?.stderr || ""
    };
  }
}

export async function stopPM2Process(id: string): Promise<{ status: string; process: string; error?: string }> {
  try {
    // Validation: Check if id is valid
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new Error("Invalid deployment ID provided");
    }

    console.log(`🗑️ Stopping PM2 process: ${id}...`);

    // Delete the PM2 process
    try {
      const result = await execCommand("pm2", ["delete", id]);
      console.log(`✅ PM2 process ${id} stopped and removed successfully`);
      console.log(`📊 PM2 Output: ${result.stdout}`);

      if (result.stderr) {
        console.warn(`⚠️ PM2 Warnings: ${result.stderr}`);
      }

      return {
        status: "stopped",
        process: id
      };
    } catch (deleteError: any) {
      // If process doesn't exist, that's fine - it's already gone
      if (deleteError?.error?.includes("doesn't exist") || deleteError?.stderr?.includes("doesn't exist")) {
        console.log(`ℹ️ PM2 process ${id} not found (already deleted)`);
        return {
          status: "not_found",
          process: id
        };
      }
      throw deleteError;
    }
  } catch (err: any) {
    console.error(`❌ Failed to stop PM2 process ${id}:`, err?.error || err?.message || 'Unknown error');
    return {
      status: "failed",
      process: id,
      error: err?.error || err?.message || "Unknown PM2 failure"
    };
  }
}

