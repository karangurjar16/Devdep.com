import { copyFinalDist, downloadS3Folder } from './aws';
import { client } from './redis'
import { buildProject } from './utils';
import { pool } from './db';
import { deployNodeProject } from './deployNode';

async function main() {
    try {
        console.log("🚀 Deployment service starting...");
        console.log("📊 Database connection initialized");

        while (true) {
            try {
                console.log("⏳ Waiting for deployment job in queue...");
                const res = await client.brPop("upload-queue", 0);
                
                // @ts-ignore
                const id = res?.element;
                
                // Validation: Check if id exists and is valid
                if (!id || typeof id !== 'string' || id.trim().length === 0) {
                    console.warn("⚠️ Invalid or empty deployment ID received, skipping...");
                    continue;
                }

                console.log(`📦 Processing deployment ID: ${id}`);
                console.log("--------------------------------------------------");

                // Fetch project from database
                let project: any = null;
                try {
                    console.log(`🔍 Fetching project details for ID: ${id}...`);
                    const result = await pool.query('SELECT * FROM "Deploy" WHERE id = $1', [id]);
                    
                    if (result.rows.length === 0) {
                        console.error(`❌ Deploy not found for id: ${id}`);
                        await client.set(`${id}:status`, "Failed - Project not found");
                        continue;
                    }
                    
                    project = result.rows[0];
                    console.log(`✅ Project found: ${project.framework || 'Unknown'} framework`);
                } catch (err: any) {
                    console.error(`❌ Error loading deploy row for id ${id}:`, err?.message || err);
                    await client.set(`${id}:status`, `Failed - Database error: ${err?.message || 'Unknown error'}`);
                    continue;
                }

                // Validation: Check if project has required fields
                if (!project || !project.framework) {
                    console.error(`❌ Invalid project data: missing framework for id ${id}`);
                    await client.set(`${id}:status`, "Failed - Invalid project data");
                    continue;
                }

                console.log("--------------------------------------------------");

                // Download files from S3
                try {
                    console.log(`📥 Downloading files from S3 for ID: ${id}...`);
                    await downloadS3Folder(`output/${id}`);
                    console.log(`✅ Files downloaded successfully for ID: ${id}`);
                } catch (err: any) {
                    console.error(`❌ Error downloading files from S3 for id ${id}:`, err?.message || err);
                    await client.set(`${id}:status`, `Failed - S3 download error: ${err?.message || 'Unknown error'}`);
                    continue;
                }

                console.log("--------------------------------------------------");

                // Process based on framework
                if (project.framework === "React") {
                    try {
                        console.log(`⚛️ React project detected, starting build process...`);
                        console.log("📦 Dependencies downloading...");
                        await buildProject(id);
                        console.log("✅ Build completed successfully");
                        
                        console.log("--------------------------------------------------");
                        console.log(`📤 Uploading final distribution for ID: ${id}...`);
                        await copyFinalDist(id);
                        console.log(`✅ Distribution uploaded successfully for ID: ${id}`);
                    } catch (err: any) {
                        console.error(`❌ Error building React project for id ${id}:`, err?.message || err);
                        await client.set(`${id}:status`, `Failed - Build error: ${err?.message || 'Unknown error'}`);
                        continue;
                    }
                } else if (project.framework === "Node") {
                    try {
                        console.log(`🟢 Node.js project detected, starting deployment...`);
                        const result = await deployNodeProject(id, project);
                        console.log("--------------------------------------------------");
                        console.log(`✅ Node.js deployment completed:`, result);
                        await client.set(`${id}:Port`,result.port)
                    } catch (err: any) {
                        console.error(`❌ Error deploying Node.js project for id ${id}:`, err?.message || err);
                        await client.set(`${id}:status`, `Failed - Deployment error: ${err?.message || 'Unknown error'}`);
                        continue;
                    }
                } else {
                    console.error(`❌ Unsupported framework: ${project.framework} for id ${id}`);
                    await client.set(`${id}:status`, `Failed - Unsupported framework: ${project.framework}`);
                    continue;
                }

                // Mark deployment as complete
                try {
                    console.log("--------------------------------------------------");
                    console.log(`✅ Marking deployment as complete for ID: ${id}...`);
                    await client.set(id, "Deployed");
                    await client.set(`${id}:status`, "Deployed");
                    console.log(`🎉 Deployment completed successfully for ID: ${id}`);
                } catch (err: any) {
                    console.error(`❌ Error updating deployment status for id ${id}:`, err?.message || err);
                }

                console.log("--------------------------------------------------");
            } catch (err: any) {
                console.error("❌ Unexpected error in deployment loop:", err?.message || err);
                // Continue to next iteration instead of crashing
                await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retrying
            }
        }
    } catch (err: any) {
        console.error("❌ Fatal error in main function:", err?.message || err);
        process.exit(1);
    }
}

// Start the application with error handling
main().catch((err: any) => {
    console.error("❌ Fatal error starting application:", err?.message || err);
    process.exit(1);
});