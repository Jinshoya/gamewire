import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 📁 Source: /events (Git-tracked markdown files)
const eventsDir = path.join(__dirname, '..', 'events');

// 📁 Destination: /public/events
const publicEventsDir = path.join(__dirname, '..', 'public', 'events');
const indexOutputPath = path.join(publicEventsDir, 'index.json');

// 🛠 Ensure /public/events/ exists
if (!fs.existsSync(publicEventsDir)) {
  fs.mkdirSync(publicEventsDir, { recursive: true });
}

// 📦 Read all .md files in /events
fs.readdir(eventsDir, (err, files) => {
  if (err) throw err;

  const markdownFiles = files.filter(file => file.endsWith('.md'));

  // ✅ Write index.json with the filenames
  fs.writeFileSync(indexOutputPath, JSON.stringify(markdownFiles, null, 2));
  console.log(`✅ Wrote ${markdownFiles.length} entries to /public/events/index.json`);

  // ✅ Copy each .md file to /public/events/
  markdownFiles.forEach((file) => {
    const src = path.join(eventsDir, file);
    const dest = path.join(publicEventsDir, file);
    fs.copyFileSync(src, dest);
  });

  console.log(`✅ Copied ${markdownFiles.length} .md files to /public/events/`);
});
