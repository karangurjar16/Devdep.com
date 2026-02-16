/**
 * TypeScript interfaces for the Deploy service
 */

/**
 * Represents a deployment project from the database
 * Matches the Deploy model from Prisma schema
 */
export interface DeployProject {
    id: string;
    email: string;
    repoUrl: string;
    projectName: string;
    framework: string;
    rootDir: string;
    env?: Record<string, string> | null;
    createdAt: Date;
}

/**
 * Environment variables object type
 */
export interface EnvVariables {
    [key: string]: string | number | boolean;
}
