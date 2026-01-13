import fs from "fs";
import path from "path";

const PORT_FILE = "./ports.json";
const START = 4000;
const END = 6000;

export function getFreePort(): number {
  try {
    let used: number[] = [];

    // Read existing ports file if it exists
    if (fs.existsSync(PORT_FILE)) {
      try {
        const fileContent = fs.readFileSync(PORT_FILE, "utf-8");
        
        // Validation: Check if file content is valid JSON
        if (!fileContent || fileContent.trim().length === 0) {
          console.warn(`⚠️ Ports file is empty, starting fresh`);
          used = [];
        } else {
          const parsed = JSON.parse(fileContent);
          
          // Validation: Check if parsed data is an array
          if (Array.isArray(parsed)) {
            used = parsed.filter((p: any) => typeof p === 'number' && p >= START && p <= END);
          } else {
            console.warn(`⚠️ Invalid ports file format, starting fresh`);
            used = [];
          }
        }
      } catch (parseError: any) {
        console.warn(`⚠️ Error reading ports file: ${parseError?.message || 'Unknown error'}, starting fresh`);
        used = [];
      }
    }

    // Find free port
    for (let p = START; p <= END; p++) {
      if (!used.includes(p)) {
        used.push(p);
        
        try {
          // Write updated ports list back to file
          fs.writeFileSync(PORT_FILE, JSON.stringify(used, null, 2));
          console.log(`✅ Port ${p} allocated and saved`);
          return p;
        } catch (writeError: any) {
          console.error(`❌ Error writing ports file: ${writeError?.message || 'Unknown error'}`);
          // Still return the port even if file write fails
          return p;
        }
      }
    }

    throw new Error(`No free ports available in range ${START}-${END}`);
  } catch (error: any) {
    console.error(`❌ Error allocating free port: ${error?.message || error}`);
    throw new Error(`Failed to get free port: ${error?.message || 'Unknown error'}`);
  }
}
