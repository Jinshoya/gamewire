import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Read from events folder at project root
const eventsDir = path.join(__dirname, '..', 'events');

// ✅ Write to public/events/index.json (so it can be fetched)
const outputDir = path.join(__dirname, '..', 'public', 'events');
const outputFile = path.join(outputDir, 'index.json');

// ✅ Ensure the /public/events folder exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// ✅ Read .md files and write index.json
fs.readdir(eventsDir, (err, files) => {
  if (err) throw err;

  const markdownFiles = files
    .filter(file => file.endsWith('.md'))
    .map(file => file);

  fs.writeFileSync(outputFile, JSON.stringify(markdownFiles, null, 2));
  console.log(`✅ Wrote ${markdownFiles.length} events to public/events/index.json`);
});
