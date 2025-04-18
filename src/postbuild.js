import fs from 'fs';
import path from 'path';

const distFolder = path.join(process.cwd(), 'dist');
const trailersHtmlPath = path.join(distFolder, 'trailers.html');

// Get the list of files in the dist/assets directory
const assetsFolder = path.join(distFolder, 'assets');
const files = fs.readdirSync(assetsFolder);

// Find the hashed script file (e.g., index-[hash].js)
const jsFile = files.find(file => file.startsWith('index') && file.endsWith('.js'));

if (jsFile) {
  // Read the trailers.html file
  let trailersHtml = fs.readFileSync(trailersHtmlPath, 'utf8');

  // Replace the script tag with the correct hashed filename
  trailersHtml = trailersHtml.replace('/src/main.js', `/assets/${jsFile}`);

  // Write the updated content back to trailers.html
  fs.writeFileSync(trailersHtmlPath, trailersHtml);

  console.log(`🎬 Successfully updated trailers.html with the correct script: /assets/${jsFile}`);
} else {
  console.error('❌ No hashed JS file found in /dist/assets');
}
