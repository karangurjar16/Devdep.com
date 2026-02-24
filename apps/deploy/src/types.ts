
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


export interface EnvVariables {
    [key: string]: string | number | boolean;
}
