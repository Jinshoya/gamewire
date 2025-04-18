const fs = require('fs');
const path = require('path');

const eventsDir = path.join(__dirname, '..', 'events');
const outputFile = path.join(eventsDir, 'index.json');

fs.readdir(eventsDir, (err, files) => {
  if (err) throw err;

  const markdownFiles = files
    .filter(file => file.endsWith('.md'))
    .map(file => file);

  fs.writeFileSync(outputFile, JSON.stringify(markdownFiles, null, 2));
  console.log(`✅ Wrote ${markdownFiles.length} events to index.json`);
});
