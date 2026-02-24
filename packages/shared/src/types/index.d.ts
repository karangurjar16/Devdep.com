/**
 * Shared types used across all apps in the monorepo.
 * These types mirror the Prisma `Deploy` model and related interfaces.
 */
/** Represents a deployment record from the database */
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
/** Environment variable map used when writing .env files */
export interface EnvVariables {
    [key: string]: string | number | boolean;
}
/** Supported deployment frameworks */
export type Framework = "React" | "Node" | "Next.js";
/** Status of a deployment job */
export type DeployStatus = "Queued" | "Cloning" | "Dependencies Download" | "Building" | "Deploying" | "Deployed" | "Failed";
/** Result returned after deploying a backend project */
export interface DeployResult {
    port: number;
    id: string;
}
//# sourceMappingURL=index.d.ts.map