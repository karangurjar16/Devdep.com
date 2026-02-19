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

    // Check if this is a Next.js project that needs to be started via next binary
    if (entryFile === 'NEXT_START') {
      // Check for standalone server.js first (most efficient - requires output: 'standalone' in next.config.js)
      const standaloneServer = path.join(projectPath, '.next', 'standalone', 'server.js');
      if (fs.existsSync(standaloneServer)) {
        console.log(`ℹ️ Using Next.js standalone server: ${standaloneServer}`);
        result = await execCommand(
          chainCommands([
            buildCdCommand(projectPath),
            `pm2 start ${standaloneServer} --name ${name} --env production`
          ])
        );
      } else {
        // Fallback: run the next binary directly from node_modules
        // This is more reliable than `npm start` because PM2 can manage the process directly
        console.log(`ℹ️ Using next binary for Next.js project`);

        // Try to find the direct JS file first (most reliable for PM2 across platforms)
        let nextExecutable = path.join(projectPath, 'node_modules', 'next', 'dist', 'bin', 'next');

        if (!fs.existsSync(nextExecutable)) {
          // Fallback to the .bin wrapper
          const isWindows = process.platform === 'win32';
          nextExecutable = path.join(projectPath, 'node_modules', '.bin', isWindows ? 'next.cmd' : 'next');
        }

        console.log(`ℹ️ Resolved Next.js executable: ${nextExecutable}`);

        // Set environment variables before running PM2
        const isWindows = process.platform === 'win32';
        // Chain commands: cd -> set env -> pm2 start
        // Note: chainCommands handles the '&&' joining.
        // We set NODE_ENV=production.
        const setEnv = isWindows ? `set NODE_ENV=production` : `export NODE_ENV=production`;

        result = await execCommand(
          chainCommands([
            buildCdCommand(projectPath),
            setEnv,
            `pm2 start "${nextExecutable}" --name ${name} -- start -p ${port}`
          ])
        );
      }
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

