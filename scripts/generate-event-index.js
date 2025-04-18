import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read from /events
const eventsDir = path.join(__dirname, '..', 'events');

// Write to /public/events/index.json
const outputDir = path.join(__dirname, '..', 'public', 'events');
const outputFile = path.join(outputDir, 'index.json');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.readdir(eventsDir, (err, files) => {
  if (err) throw err;

  const markdownFiles = files
    .filter(file => file.endsWith('.md'))
    .map(file => file);

  fs.writeFileSync(outputFile, JSON.stringify(markdownFiles, null, 2));
  console.log(`✅ Wrote ${markdownFiles.length} events to public/events/index.json`);

  // ✅ Copy to dist/events/ to ensure Netlify sees it
  const distEventsDir = path.join(__dirname, '..', 'dist', 'events');
  const distOutputFile = path.join(distEventsDir, 'index.json');

  if (!fs.existsSync(distEventsDir)) {
    fs.mkdirSync(distEventsDir, { recursive: true });
  }

  fs.copyFileSync(outputFile, distOutputFile);
  console.log(`✅ Copied index.json to dist/events/index.json`);
});
