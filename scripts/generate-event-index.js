import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Re-create __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Point to the public events folder
const eventsDir = path.join(__dirname, '..', 'events');
const outputFile = path.join(eventsDir, 'index.json');

// Read .md files and write index.json
fs.readdir(eventsDir, (err, files) => {
  if (err) throw err;

  const markdownFiles = files
    .filter(file => file.endsWith('.md'))
    .map(file => file);

  fs.writeFileSync(outputFile, JSON.stringify(markdownFiles, null, 2));
  console.log(`✅ Wrote ${markdownFiles.length} events to index.json`);
});
