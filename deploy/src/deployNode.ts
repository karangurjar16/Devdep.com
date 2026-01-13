import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { getFreePort } from "./portManager";
import { startWithPM2 } from "./pm2Runner";

function execPromise(cmd: string, cwd: string) {
  return new Promise((resolve, reject) => {
    try {
      // Validation: Check if cwd exists
      if (!fs.existsSync(cwd)) {
        return reject(new Error(`Directory does not exist: ${cwd}`));
      }

      exec(cmd, { cwd }, (err, stdout, stderr) => {
        if (err) {
          reject(new Error(stderr || err.message || "Command execution failed"));
        } else {
          resolve(stdout);
        }
      });
    } catch (error: any) {
      reject(new Error(`Failed to execute command: ${error?.message || 'Unknown error'}`));
    }
  });
}

function writeEnvFile(projectPath: string, envObject: any) {
  try {
    // Validation: Check if projectPath exists
    if (!fs.existsSync(projectPath)) {
      throw new Error(`Project path does not exist: ${projectPath}`);
    }

    const envLines: string[] = [];

    if (envObject && typeof envObject === 'object') {
      for (const key in envObject) {
        if (envObject[key] !== null && envObject[key] !== undefined) {
          envLines.push(`${key.toUpperCase()}=${envObject[key]}`);
        }
      }
    }

    const envContent = envLines.join("\n");
    const envFilePath = path.join(projectPath, ".env");
    fs.writeFileSync(envFilePath, envContent);
    console.log(`✅ Environment file created at: ${envFilePath}`);
  } catch (error: any) {
    throw new Error(`Failed to write .env file: ${error?.message || 'Unknown error'}`);
  }
}

export async function deployNodeProject(id: string, project: any) {
  try {
    // Validation: Check required parameters
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new Error("Invalid deployment ID provided");
    }

    if (!project || typeof project !== 'object') {
      throw new Error("Invalid project object provided");
    }

    const projectPath = path.join(process.cwd(), "dist/output", id);

    // Validation: Check if project directory exists
    if (!fs.existsSync(projectPath)) {
      throw new Error(`Project directory does not exist: ${projectPath}`);
    }

    console.log(`📁 Project path: ${projectPath}`);

    // Create .env from DB row
    try {
      console.log("📝 Creating environment file...");
      writeEnvFile(projectPath, project.env || {});
    } catch (error: any) {
      throw new Error(`Failed to create environment file: ${error?.message || 'Unknown error'}`);
    }

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
      await execPromise("npm install", projectPath);
      console.log("✅ Dependencies installed successfully");
    } catch (error: any) {
      throw new Error(`Failed to install dependencies: ${error?.message || 'Unknown error'}`);
    }

    // Build project if build script exists
    if (pkg.scripts?.build) {
      try {
        console.log("🔨 Building started...");
        await execPromise("npm run build", projectPath);
        console.log("✅ Building ended successfully");
      } catch (error: any) {
        throw new Error(`Build failed: ${error?.message || 'Unknown error'}`);
      }
    } else {
      console.log("ℹ️ No build script found, skipping build step");
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

    // Start with PM2
    console.log("🚀 Starting application with PM2...");
    const result = await startWithPM2(id, projectPath, port);

    if (result.status === "failed") {
      throw new Error(`PM2 startup failed: ${result.error || 'Unknown error'}`);
    }

    console.log(`✅ Application started successfully with PM2`);

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