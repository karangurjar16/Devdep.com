import { exec } from "child_process";
import fs from "fs";
import path from "path";

function run(cmd: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    try {
      if (!cmd || typeof cmd !== 'string' || cmd.trim().length === 0) {
        return reject({
          error: "Invalid command provided",
          stdout: "",
          stderr: ""
        });
      }

      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          return reject({
            error: error.message,
            stdout: stdout?.toString() || "",
            stderr: stderr?.toString() || ""
          });
        }
        resolve({
          stdout: stdout?.toString() || "",
          stderr: stderr?.toString() || ""
        });
      });
    } catch (err: any) {
      reject({
        error: `Command execution error: ${err?.message || 'Unknown error'}`,
        stdout: "",
        stderr: ""
      });
    }
  });
}

export async function startWithPM2(id: string, projectPath: string, port: number) {
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

    // Validation: Check if index.js exists
    const indexJsPath = path.join(projectPath, "index.js");
    if (!fs.existsSync(indexJsPath)) {
      throw new Error(`index.js not found at: ${indexJsPath}`);
    }

    console.log(`🔧 Initializing PM2 daemon...`);

    // 1. Ensure PM2 daemon is running
    try {
      await run(`cmd /c "pm2 ping"`);
      console.log(`✅ PM2 daemon is running`);
    } catch (pingError) {
      console.log(`⚠️ PM2 daemon not responding, attempting to resurrect...`);
      try {
        await run(`cmd /c "pm2 resurrect"`);
        console.log(`✅ PM2 daemon resurrected`);
      } catch (resurrectError: any) {
        console.warn(`⚠️ Could not resurrect PM2 daemon: ${resurrectError?.error || 'Unknown error'}`);
      }
    }

    // 2. Delete existing process with same name (if any)
    console.log(`🗑️ Cleaning up existing process with name: ${name}...`);
    try {
      await run(`cmd /c "pm2 delete ${name}"`);
      console.log(`✅ Existing process deleted`);
    } catch (deleteError) {
      // Ignore error if process doesn't exist
      console.log(`ℹ️ No existing process found with name: ${name}`);
    }

    // 3. Start with correct PORT env
    console.log(`🚀 Starting application with PM2 on port ${port}...`);
    const startCmd = `cmd /c "cd /d "${projectPath}" && set PORT=${port} && pm2 start index.js --name ${name}"`;
    const result = await run(startCmd);

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
