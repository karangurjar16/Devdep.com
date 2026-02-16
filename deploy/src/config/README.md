# Command Runner Utility

This utility provides OS-agnostic command execution for the deployment system. It automatically detects the operating system and wraps commands appropriately.

## Features

- **OS Detection**: Automatically detects Windows, Linux, and macOS
- **Dynamic Command Execution**: Runs commands with proper OS-specific wrappers
- **Directory Execution**: Execute commands in specific directories
- **Environment Variables**: Set environment variables before running commands
- **Command Chaining**: Chain multiple commands together

## Usage Examples

### Basic Command Execution

```typescript
import { execCommand } from "./config/commandRunner";

// Simple command with arguments
await execCommand("pm2", ["ping"]);

// Command with multiple arguments
await execCommand("pm2", ["start", "index.js", "--name", "myapp"]);

// Command without arguments
await execCommand("npm", ["install"]);
```

### Execute in Specific Directory

```typescript
import { execInDirectory } from "./config/commandRunner";

// Run npm install in a specific directory
await execInDirectory("C:\\projects\\myapp", "npm", ["install"]);

// Start a server in a specific directory
await execInDirectory("/var/www/myapp", "npm", ["start"]);
```

### Execute with Environment Variables

```typescript
import { execWithEnv } from "./config/commandRunner";

// Set PORT and NODE_ENV before running
await execWithEnv(
  { PORT: "3000", NODE_ENV: "production" },
  "npm",
  ["start"]
);
```

### Chain Multiple Commands

```typescript
import { chainCommands, execCommand } from "./config/commandRunner";

// Chain multiple commands together
const chained = chainCommands([
  "cd /path/to/project",
  "npm install",
  "npm run build"
]);

await execCommand(chained);
```

### Advanced: PM2 with Directory and Environment

```typescript
import { execInDirectory, chainCommands } from "./config/commandRunner";

// Start PM2 in a specific directory with PORT set
await execInDirectory(
  projectPath,
  chainCommands([
    `set PORT=${port}`,
    `pm2 start index.js --name ${name}`
  ])
);
```

## API Reference

### `detectOS(): OSType`
Returns the current operating system type: `"windows"`, `"linux"`, `"darwin"`, or `"unknown"`.

### `execCommand(command: string, args?: string[]): Promise<CommandResult>`
Executes a command with optional arguments. Automatically wraps the command for the current OS.

**Parameters:**
- `command`: The command to execute (e.g., "pm2", "npm", "git")
- `args`: Optional array of arguments

**Returns:** Promise resolving to `{ stdout: string, stderr: string }`

### `execInDirectory(directory: string, command: string, args?: string[]): Promise<CommandResult>`
Executes a command in a specific directory.

**Parameters:**
- `directory`: The directory path to execute in
- `command`: The command to execute
- `args`: Optional array of arguments

### `execWithEnv(envVars: Record<string, string>, command: string, args?: string[]): Promise<CommandResult>`
Executes a command with environment variables set.

**Parameters:**
- `envVars`: Object containing environment variable key-value pairs
- `command`: The command to execute
- `args`: Optional array of arguments

### `chainCommands(commands: string[]): string`
Chains multiple commands together with the appropriate OS separator.

**Parameters:**
- `commands`: Array of commands to chain

**Returns:** A single string with all commands chained

### `buildCdCommand(directory: string): string`
Builds an OS-specific change directory command.

**Parameters:**
- `directory`: The directory path

**Returns:** The OS-specific cd command

## Error Handling

All command execution functions return a Promise that:
- **Resolves** with `{ stdout: string, stderr: string }` on success
- **Rejects** with `{ error: string, stdout: string, stderr: string }` on failure

Example error handling:

```typescript
try {
  const result = await execCommand("pm2", ["ping"]);
  console.log("Success:", result.stdout);
} catch (error: any) {
  console.error("Error:", error.error);
  console.error("Stderr:", error.stderr);
}
```

## OS-Specific Behavior

### Windows
- Commands are wrapped with `cmd /c "command"`
- Directory changes use `cd /d "path"`
- Environment variables use `set VAR=value`
- Commands are chained with `&&`

### Linux/macOS
- Commands are executed directly
- Directory changes use `cd "path"`
- Environment variables use `VAR=value`
- Commands are chained with `&&`
