import { spawn } from "child_process";
import { platform } from "os";

/**
 * Detected operating system type
 */
export type OSType = "windows" | "linux" | "darwin" | "unknown";

/**
 * Command execution result
 */
export interface CommandResult {
    stdout: string;
    stderr: string;
}

/**
 * Command execution error
 */
export interface CommandError {
    error: string;
    stdout: string;
    stderr: string;
}

const util = require('util');
const exec = util.promisify(require('child_process').exec);

export async function execCommand(command: string): Promise<CommandResult> {
    try {
        console.log(`\n🔧 [EXEC] Executing: ${command}`);
        const { stdout, stderr } = await exec(command);
        console.log(`✅ [EXEC SUCCESS]`);
        return { stdout, stderr };
    } catch (err: any) {
        console.error(`❌ [EXEC ERROR] ${err?.message || "Unknown error"}`);
        throw {
            error: err.message,
            stdout: err.stdout || "",
            stderr: err.stderr || ""
        } as CommandError;
    }
}

export function chainCommands(commands: string[]): string {
    const os = detectOS();
    const separator = os === "windows" ? " && " : " && ";
    return commands.filter(cmd => cmd.trim() !== "").join(separator);
}

export function buildCdCommand(directory: string): string {
    const os = detectOS();
    if (os === "windows") {
        // On Windows, cd to a different drive requires the /d flag
        return `cd /d "${directory}"`;
    }
    return `cd "${directory}"`;
}

/**
 * Detects the current operating system
 * @returns The detected OS type
 */
export function detectOS(): OSType {
    const os = platform();

    switch (os) {
        case "win32":
            return "windows";
        case "linux":
            return "linux";
        case "darwin":
            return "darwin";
        default:
            return "unknown";
    }
}



/**
 * Executes a command based on OS and streams output in real-time.
 * @param command - The command to execute
 * @param args - Array of arguments for the command
 * @param onData - Callback to handle streaming standard output and error line-by-line
 * @returns Promise resolving to CommandResult or rejecting with CommandError
 */
export function spawnCommand(
    command: string,
    args: string[] = [],
    onData?: (data: string) => void
): Promise<CommandResult> {
    return new Promise<CommandResult>((resolve, reject) => {
        try {
            if (!command || typeof command !== "string" || command.trim().length === 0) {
                return reject({
                    error: "Invalid command provided",
                    stdout: "",
                    stderr: "",
                } as CommandError);
            }

            const os = detectOS();
            let procCommand = command;
            let procArgs = args;
            let shell = false;

            if (os === "windows") {
                shell = true;
            }

            console.log(`\n🔧 [SPAWN] Executing: ${procCommand} ${procArgs.join(" ")}`);

            const child = spawn(procCommand, procArgs, { shell });

            let stdoutOutput = "";
            let stderrOutput = "";
            let stdoutBuffer = "";
            let stderrBuffer = "";

            child.stdout.on("data", (data) => {
                const text = data.toString();
                stdoutOutput += text;
                if (onData) {
                    stdoutBuffer += text;
                    const lines = stdoutBuffer.split('\n');
                    stdoutBuffer = lines.pop() || "";
                    lines.filter((line: string) => line.trim()).forEach((line: string) => onData(line));
                }
            });

            child.stderr.on("data", (data) => {
                const text = data.toString();
                stderrOutput += text;
                if (onData) {
                    stderrBuffer += text;
                    const lines = stderrBuffer.split('\n');
                    stderrBuffer = lines.pop() || "";
                    lines.filter((line: string) => line.trim()).forEach((line: string) => onData(`[stderr] ${line}`));
                }
            });

            child.on("error", (error) => {
                console.error(`❌ [SPAWN ERROR] ${error.message}`);
                reject({
                    error: error.message,
                    stdout: stdoutOutput,
                    stderr: stderrOutput,
                } as CommandError);
            });

            child.on("close", (code) => {
                if (onData) {
                    if (stdoutBuffer.trim()) onData(stdoutBuffer);
                    if (stderrBuffer.trim()) onData(`[stderr] ${stderrBuffer}`);
                }
                if (code === 0) {
                    console.log(`✅ [SPAWN SUCCESS]`);
                    resolve({
                        stdout: stdoutOutput,
                        stderr: stderrOutput,
                    });
                } else {
                    console.error(`❌ [SPAWN EXIT CODE] ${code}`);
                    reject({
                        error: `Process exited with code ${code}`,
                        stdout: stdoutOutput,
                        stderr: stderrOutput,
                    } as CommandError);
                }
            });

        } catch (err: any) {
            console.error(`❌ [SPAWN EXECUTION ERROR] ${err?.message || "Unknown error"}`);
            reject({
                error: `Command execution error: ${err?.message || "Unknown error"}`,
                stdout: "",
                stderr: "",
            } as CommandError);
        }
    });
}



/**
 * Executes a command in a specific directory using spawn to stream output in real-time.
 * @param directory - The directory path
 * @param command - The command to execute
 * @param args - Array of arguments for the command
 * @param onData - Callback to handle streaming logs
 * @returns Promise resolving to CommandResult
 */
export function spawnInDirectory(
    directory: string,
    command: string,
    args: string[] = [],
    onData?: (data: string) => void
): Promise<CommandResult> {
    return new Promise<CommandResult>((resolve, reject) => {
        try {
            const os = detectOS();
            let shell = false;

            if (os === "windows") {
                shell = true;
            }

            console.log(`\n🔧 [SPAWN] Executing in ${directory}: ${command} ${args.join(" ")}`);

            const child = spawn(command, args, { shell, cwd: directory });

            let stdoutOutput = "";
            let stderrOutput = "";
            let stdoutBuffer = "";
            let stderrBuffer = "";

            child.stdout.on("data", (data) => {
                const text = data.toString();
                stdoutOutput += text;
                if (onData) {
                    stdoutBuffer += text;
                    const lines = stdoutBuffer.split('\n');
                    stdoutBuffer = lines.pop() || "";
                    lines.filter((line: string) => line.trim()).forEach((line: string) => onData(line));
                }
            });

            child.stderr.on("data", (data) => {
                const text = data.toString();
                stderrOutput += text;
                if (onData) {
                    stderrBuffer += text;
                    const lines = stderrBuffer.split('\n');
                    stderrBuffer = lines.pop() || "";
                    lines.filter((line: string) => line.trim()).forEach((line: string) => onData(`[stderr] ${line}`));
                }
            });

            child.on("error", (error) => {
                console.error(`❌ [SPAWN ERROR] ${error.message}`);
                reject({
                    error: error.message,
                    stdout: stdoutOutput,
                    stderr: stderrOutput,
                } as CommandError);
            });

            child.on("close", (code) => {
                if (onData) {
                    if (stdoutBuffer.trim()) onData(stdoutBuffer);
                    if (stderrBuffer.trim()) onData(`[stderr] ${stderrBuffer}`);
                }
                if (code === 0) {
                    console.log(`✅ [SPAWN SUCCESS]`);
                    resolve({
                        stdout: stdoutOutput,
                        stderr: stderrOutput,
                    });
                } else {
                    console.error(`❌ [SPAWN EXIT CODE] ${code}`);
                    reject({
                        error: `Process exited with code ${code}`,
                        stdout: stdoutOutput,
                        stderr: stderrOutput,
                    } as CommandError);
                }
            });
        } catch (err: any) {
            console.error(`❌ [SPAWN EXECUTION ERROR] ${err?.message || "Unknown error"}`);
            reject({
                error: `Command execution error: ${err?.message || "Unknown error"}`,
                stdout: "",
                stderr: "",
            } as CommandError);
        }
    });
}

/**
 * Executes a command in a directory with environment variables using spawn to stream output.
 * @param directory - The directory path
 * @param envVars - Object containing environment variables
 * @param command - The command to execute
 * @param args - Array of arguments for the command
 * @param onData - Callback to handle streaming logs
 * @returns Promise resolving to CommandResult
 */
export function spawnInDirectoryWithEnv(
    directory: string,
    envVars: Record<string, string>,
    command: string,
    args: string[] = [],
    onData?: (data: string) => void
): Promise<CommandResult> {
    return new Promise<CommandResult>((resolve, reject) => {
        try {
            const os = detectOS();
            let shell = false;

            if (os === "windows") {
                shell = true;
            }

            console.log(`\n🔧 [SPAWN ENV] Executing in ${directory}: ${command} ${args.join(" ")}`);

            // Merge existing process.env with the provided envVars
            const mergedEnv = { ...process.env, ...envVars };

            const child = spawn(command, args, { shell, cwd: directory, env: mergedEnv as any });

            let stdoutOutput = "";
            let stderrOutput = "";
            let stdoutBuffer = "";
            let stderrBuffer = "";

            child.stdout.on("data", (data) => {
                const text = data.toString();
                stdoutOutput += text;
                if (onData) {
                    stdoutBuffer += text;
                    const lines = stdoutBuffer.split('\n');
                    stdoutBuffer = lines.pop() || "";
                    lines.filter((line: string) => line.trim()).forEach((line: string) => onData(line));
                }
            });

            child.stderr.on("data", (data) => {
                const text = data.toString();
                stderrOutput += text;
                if (onData) {
                    stderrBuffer += text;
                    const lines = stderrBuffer.split('\n');
                    stderrBuffer = lines.pop() || "";
                    lines.filter((line: string) => line.trim()).forEach((line: string) => onData(`[stderr] ${line}`));
                }
            });

            child.on("error", (error) => {
                console.error(`❌ [SPAWN ERROR] ${error.message}`);
                reject({
                    error: error.message,
                    stdout: stdoutOutput,
                    stderr: stderrOutput,
                } as CommandError);
            });

            child.on("close", (code) => {
                if (onData) {
                    if (stdoutBuffer.trim()) onData(stdoutBuffer);
                    if (stderrBuffer.trim()) onData(`[stderr] ${stderrBuffer}`);
                }
                if (code === 0) {
                    console.log(`✅ [SPAWN SUCCESS]`);
                    resolve({
                        stdout: stdoutOutput,
                        stderr: stderrOutput,
                    });
                } else {
                    console.error(`❌ [SPAWN EXIT CODE] ${code}`);
                    reject({
                        error: `Process exited with code ${code}`,
                        stdout: stdoutOutput,
                        stderr: stderrOutput,
                    } as CommandError);
                }
            });
        } catch (err: any) {
            console.error(`❌ [SPAWN EXECUTION ERROR] ${err?.message || "Unknown error"}`);
            reject({
                error: `Command execution error: ${err?.message || "Unknown error"}`,
                stdout: "",
                stderr: "",
            } as CommandError);
        }
    });
}
