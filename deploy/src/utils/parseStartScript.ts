import path from "path";
import fs from "fs";

/**
 * Parses the npm start script from package.json and extracts the entry file
 * @param projectPath - Absolute path to the project directory
 * @param pkg - Parsed package.json object
 * @returns The entry file path relative to projectPath, or null if not found
 */
export function parseStartScript(projectPath: string, pkg: any): string | null {
    try {
        // Check if start script exists
        const startScript = pkg.scripts?.start;
        if (!startScript || typeof startScript !== 'string') {
            console.log("ℹ️ No start script found in package.json");
            return null;
        }

        console.log(`📝 Parsing start script: ${startScript}`);

        // Common patterns to match:
        // - "node index.js"
        // - "node dist/index.js"
        // - "node build/server.js"
        // - "node ./src/index.js"
        // - "NODE_ENV=production node server.js"
        // - "next start" (Next.js)
        // - "ts-node src/index.ts" (TypeScript)

        // Remove environment variables from the beginning
        let cleanScript = startScript.replace(/^(\w+=\S+\s+)+/, '').trim();

        // Handle Next.js
        if (cleanScript.includes('next start')) {
            console.log("ℹ️ Detected Next.js project");
            // For Next.js, we need to use the .next/standalone/server.js if it exists
            // Otherwise, we'll return a special marker
            const standaloneServer = path.join(projectPath, '.next', 'standalone', 'server.js');
            if (fs.existsSync(standaloneServer)) {
                return path.relative(projectPath, standaloneServer);
            }
            return 'NEXT_START'; // Special marker for Next.js
        }

        // Match patterns like: node <file>, nodejs <file>, ts-node <file>
        const nodePatterns = [
            /(?:node|nodejs)\s+([^\s&|;]+)/i,
            /ts-node\s+([^\s&|;]+)/i
        ];

        for (const pattern of nodePatterns) {
            const match = cleanScript.match(pattern);
            if (match && match[1]) {
                let entryFile = match[1].trim();

                // Remove quotes if present
                entryFile = entryFile.replace(/^['"]|['"]$/g, '');

                // Remove leading ./ if present
                entryFile = entryFile.replace(/^\.\//, '');

                console.log(`✅ Extracted entry file: ${entryFile}`);

                // Verify the file exists
                const fullPath = path.join(projectPath, entryFile);
                if (fs.existsSync(fullPath)) {
                    return entryFile;
                } else {
                    console.warn(`⚠️ Entry file not found: ${fullPath}`);

                    // Try with .js extension if it's missing
                    if (!entryFile.endsWith('.js') && !entryFile.endsWith('.ts')) {
                        const withJs = `${entryFile}.js`;
                        const fullPathWithJs = path.join(projectPath, withJs);
                        if (fs.existsSync(fullPathWithJs)) {
                            console.log(`✅ Found entry file with .js extension: ${withJs}`);
                            return withJs;
                        }
                    }
                }
            }
        }

        console.warn(`⚠️ Could not parse entry file from start script: ${startScript}`);
        return null;
    } catch (error: any) {
        console.error(`❌ Error parsing start script: ${error?.message || 'Unknown error'}`);
        return null;
    }
}

/**
 * Gets the entry file for a project, with fallback logic
 * @param projectPath - Absolute path to the project directory
 * @param pkg - Parsed package.json object
 * @param projectType - Type of project (NODE or NEXT)
 * @returns The entry file path relative to projectPath
 */
export function getEntryFile(projectPath: string, pkg: any, projectType: 'NODE' | 'NEXT'): string {
    // First, try to parse from start script
    const parsedEntry = parseStartScript(projectPath, pkg);

    if (parsedEntry) {
        if (parsedEntry === 'NEXT_START') {
            // Special case for Next.js - we'll handle this differently in pm2Runner
            return parsedEntry;
        }
        return parsedEntry;
    }

    // Fallback logic based on project type
    if (projectType === 'NEXT') {
        // For Next.js, check for standalone server
        const standaloneServer = path.join(projectPath, '.next', 'standalone', 'server.js');
        if (fs.existsSync(standaloneServer)) {
            return path.relative(projectPath, standaloneServer);
        }
        return 'NEXT_START'; // Will use npm start as fallback
    }

    // For Node.js projects, try common entry files
    const commonEntries = [
        'dist/index.js',
        'build/index.js',
        'dist/server.js',
        'build/server.js',
        'dist/main.js',
        'build/main.js',
        'index.js',
        'server.js',
        'main.js',
        'app.js'
    ];

    for (const entry of commonEntries) {
        const fullPath = path.join(projectPath, entry);
        if (fs.existsSync(fullPath)) {
            console.log(`✅ Found entry file: ${entry}`);
            return entry;
        }
    }

    // Ultimate fallback
    console.warn(`⚠️ No entry file found, falling back to index.js`);
    return 'index.js';
}
