import { exec } from "child_process";
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
 * Wraps a command for the current operating system
 * @param command - The base command to execute
 * @param args - Optional arguments for the command
 * @returns The OS-specific wrapped command
 */
export function wrapCommand(command: string, args: string[] = []): string {
    const os = detectOS();
    const fullCommand = args.length > 0 ? `${command} ${args.join(" ")}` : command;

    switch (os) {
        case "windows":
            // Use cmd /c for Windows to ensure proper command execution
            return `cmd /c "${fullCommand}"`;
        case "linux":
        case "darwin":
            // Unix-like systems can execute commands directly
            return fullCommand;
        default:
            // Fallback to direct execution
            return fullCommand;
    }
}

/**
 * Executes a command dynamically based on the operating system
 * @param command - The command to execute (e.g., "pm2", "cd", "npm")
 * @param args - Optional array of arguments for the command
 * @returns Promise resolving to command output or rejecting with error
 * 
 * @example
 * // Simple command
 * await execCommand("pm2", ["ping"]);
 * 
 * @example
 * // Command with multiple arguments
 * await execCommand("pm2", ["start", "index.js", "--name", "myapp"]);
 * 
 * @example
 * // Change directory and run command (Windows)
 * await execCommand("cd /d \"C:\\path\" && npm install");
 */
export function execCommand(
    command: string,
    args: string[] = []
): Promise<CommandResult> {
    return new Promise<CommandResult>((resolve, reject) => {
        try {
            // Validate command
            if (!command || typeof command !== "string" || command.trim().length === 0) {
                return reject({
                    error: "Invalid command provided",
                    stdout: "",
                    stderr: "",
                } as CommandError);
            }

            // Wrap command for OS compatibility
            const wrappedCommand = wrapCommand(command, args);

            // Log the command being executed
            console.log(`\n🔧 [COMMAND] Executing: ${wrappedCommand}`);

            exec(wrappedCommand, (error, stdout, stderr) => {
                if (error) {
                    console.error(`❌ [COMMAND ERROR] ${error.message}`);
                    if (stdout) console.log(`📤 [STDOUT] ${stdout.toString()}`);
                    if (stderr) console.error(`📛 [STDERR] ${stderr.toString()}`);

                    return reject({
                        error: error.message,
                        stdout: stdout?.toString() || "",
                        stderr: stderr?.toString() || "",
                    } as CommandError);
                }

                // Log successful execution
                console.log(`✅ [COMMAND SUCCESS]`);
                if (stdout && stdout.toString().trim()) {
                    console.log(`📤 [STDOUT]\n${stdout.toString()}`);
                }
                if (stderr && stderr.toString().trim()) {
                    console.warn(`⚠️ [STDERR]\n${stderr.toString()}`);
                }

                resolve({
                    stdout: stdout?.toString() || "",
                    stderr: stderr?.toString() || "",
                });
            });
        } catch (err: any) {
            console.error(`❌ [EXECUTION ERROR] ${err?.message || "Unknown error"}`);
            reject({
                error: `Command execution error: ${err?.message || "Unknown error"}`,
                stdout: "",
                stderr: "",
            } as CommandError);
        }
    });
}

/**
 * Builds a change directory command for the current OS
 * @param directory - The directory path to change to
 * @returns The OS-specific cd command
 */
export function buildCdCommand(directory: string): string {
    const os = detectOS();

    switch (os) {
        case "windows":
            // Windows uses /d flag to change drive as well
            return `cd /d "${directory}"`;
        case "linux":
        case "darwin":
            return `cd "${directory}"`;
        default:
            return `cd "${directory}"`;
    }
}

/**
 * Builds a command chain (multiple commands executed sequentially)
 * @param commands - Array of commands to chain
 * @returns The OS-specific chained command
 */
export function chainCommands(commands: string[]): string {
    const os = detectOS();
    const separator = os === "windows" ? " && " : " && ";
    return commands.join(separator);
}

/**
 * Executes a command in a specific directory
 * @param directory - The directory to execute the command in
 * @param command - The command to execute
 * @param args - Optional arguments for the command
 * @returns Promise resolving to command output
 * 
 * @example
 * await execInDirectory("C:\\projects\\myapp", "npm", ["install"]);
 */
export function execInDirectory(
    directory: string,
    command: string,
    args: string[] = []
): Promise<CommandResult> {
    const cdCommand = buildCdCommand(directory);
    const mainCommand = args.length > 0 ? `${command} ${args.join(" ")}` : command;
    const fullCommand = chainCommands([cdCommand, mainCommand]);

    return execCommand(fullCommand);
}

/**
 * Sets environment variables and executes a command
 * @param envVars - Object containing environment variable key-value pairs
 * @param command - The command to execute
 * @param args - Optional arguments for the command
 * @returns Promise resolving to command output
 * 
 * @example
 * await execWithEnv({ PORT: "3000", NODE_ENV: "production" }, "npm", ["start"]);
 */
export function execWithEnv(
    envVars: Record<string, string>,
    command: string,
    args: string[] = []
): Promise<CommandResult> {
    const os = detectOS();
    const mainCommand = args.length > 0 ? `${command} ${args.join(" ")}` : command;

    let fullCommand: string;

    if (os === "windows") {
        // Windows uses 'set VAR=value &&'
        const envCommands = Object.entries(envVars).map(
            ([key, value]) => `set ${key}=${value}`
        );
        fullCommand = chainCommands([...envCommands, mainCommand]);
    } else {
        // Unix-like systems use 'VAR=value'
        const envPrefix = Object.entries(envVars)
            .map(([key, value]) => `${key}=${value}`)
            .join(" ");
        fullCommand = `${envPrefix} ${mainCommand}`;
    }

    return execCommand(fullCommand);
}

/**
 * Executes a command in a specific directory with environment variables
 * @param directory - The directory to execute the command in
 * @param envVars - Object containing environment variable key-value pairs
 * @param command - The command to execute
 * @param args - Optional arguments for the command
 * @returns Promise resolving to command output
 */
export function execInDirectoryWithEnv(
    directory: string,
    envVars: Record<string, string>,
    command: string,
    args: string[] = []
): Promise<CommandResult> {
    const os = detectOS();
    const cdCommand = buildCdCommand(directory);
    const mainCommand = args.length > 0 ? `${command} ${args.join(" ")}` : command;

    if (os === "windows") {
        const envCommands = Object.entries(envVars).map(
            ([key, value]) => `set ${key}=${value}`
        );
        return execCommand(chainCommands([cdCommand, ...envCommands, mainCommand]));
    } else {
        const envPrefix = Object.entries(envVars)
            .map(([key, value]) => `${key}=${value}`)
            .join(" ");
        return execCommand(chainCommands([cdCommand, `${envPrefix} ${mainCommand}`]));
    }
}
