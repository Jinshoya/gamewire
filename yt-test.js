import 'dotenv/config';

const apiKey = process.env.VITE_YOUTUBE_API_KEY;
const channelId = 'UCy1Ms_5qBTawC-k7PVjHXKQ';

const testUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`;
console.log("🌐 Hitting YouTube API:", testUrl);

try {
  const res = await fetch(testUrl);
  console.log("📬 YouTube status:", res.status);

  const text = await res.text();
  console.log("📦 Response text:", text);
} catch (err) {
  console.error("💥 Crash error:", err);
}
