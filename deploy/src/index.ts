import { copyFinalDist, downloadS3Folder } from './aws';
import { client } from './redis'
import { buildProject } from './utils';

async function main() {
    while(1) {
        const res = await client.brPop("upload-queue", 0);
        // @ts-ignore;
        const id = "w4byr";
        
        await downloadS3Folder(`output/${id}`)
        await buildProject(id);
        copyFinalDist(id);
        client.set(id, "Deployed")
    }
}
main();