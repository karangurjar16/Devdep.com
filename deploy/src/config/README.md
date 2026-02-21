# Command Runner Utility

This utility provides OS-agnostic command execution for the deployment system using `spawn`. It automatically detects the operating system and streams output in real-time.

## Features

- **OS Detection**: Automatically detects Windows, Linux, and macOS
- **Real-time Streaming**: Streams stdout and stderr line-by-line
- **Directory Execution**: Execute commands directly in specific directories without chaining commands
- **Environment Variables**: Set environment variables before running commands

## Usage Examples

### Basic Command Execution

```typescript
import { spawnCommand } from "./config/commandRunner";

// Simple command with arguments
await spawnCommand("pm2", ["ping"]);

// Command with multiple arguments
await spawnCommand("pm2", ["start", "index.js", "--name", "myapp"]);

// Command without arguments
await spawnCommand("npm", ["install"]);
```

### Execute in Specific Directory

```typescript
import { spawnInDirectory } from "./config/commandRunner";

// Run npm install in a specific directory
await spawnInDirectory("C:\\projects\\myapp", "npm", ["install"]);

// Start a server in a specific directory
await spawnInDirectory("/var/www/myapp", "npm", ["start"]);
```

### Execute with Environment Variables

```typescript
import { spawnInDirectoryWithEnv } from "./config/commandRunner";

// Set PORT and NODE_ENV before running PM2
await spawnInDirectoryWithEnv(
  "/var/www/myapp",
  { PORT: "3000", NODE_ENV: "production" },
  "pm2",
  ["start", "index.js", "--name", "myapp"]
);
```

## API Reference

### `detectOS(): OSType`
Returns the current operating system type: `"windows"`, `"linux"`, `"darwin"`, or `"unknown"`.

### `spawnCommand(command: string, args?: string[], onData?: (data: string) => void): Promise<CommandResult>`
Executes a command with optional arguments and real-time streaming using `spawn`.

**Parameters:**
- `command`: The command to execute (e.g., "pm2", "npm", "git")
- `args`: Optional array of arguments
- `onData`: Optional callback for streaming log outputs

**Returns:** Promise resolving to `{ stdout: string, stderr: string }`

### `spawnInDirectory(directory: string, command: string, args?: string[], onData?: (data: string) => void): Promise<CommandResult>`
Executes a command in a specific directory using `spawn`.

**Parameters:**
- `directory`: The directory path to execute in
- `command`: The command to execute
- `args`: Optional array of arguments
- `onData`: Optional callback for streaming log outputs

### `spawnInDirectoryWithEnv(directory: string, envVars: Record<string, string>, command: string, args?: string[], onData?: (data: string) => void): Promise<CommandResult>`
Executes a command with environment variables set in a specific directory using `spawn`.

**Parameters:**
- `directory`: The directory path to execute in
- `envVars`: Object containing environment variable key-value pairs
- `command`: The command to execute
- `args`: Optional array of arguments
- `onData`: Optional callback for streaming log outputs

## Error Handling

All command execution functions return a Promise that:
- **Resolves** with `{ stdout: string, stderr: string }` on success
- **Rejects** with `{ error: string, stdout: string, stderr: string }` on failure

Example error handling:

```typescript
try {
  const result = await spawnCommand("pm2", ["ping"]);
  console.log("Success:", result.stdout);
} catch (error: any) {
  console.error("Error:", error.error);
  console.error("Stderr:", error.stderr);
}
```

## OS-Specific Behavior

### Windows
- Commands are spawned with `shell: true` enabled automatically

### Linux/macOS
- Commands are executed directly with `shell: false` for better security and stability
