// netlify/functions/sync-trailers.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const apiKey = process.env.VITE_YOUTUBE_API_KEY;

const channels = [
  { id: 'UCJx5KP-pCUmL9eZUv-mIcNw', type: 'game' },
  { id: 'UCi8e0iOVk1fEOogdfu4YgfA', type: 'movie' },
  { id: 'UC6A-Z0jDKemh9-CwGbj5yog', type: 'russian' },
  { id: 'UCEScTo5Hk1YXsCqGW1zgQEw', type: 'russian' }
];

async function getUploadsPlaylist(channelId) {
  const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`);
  const data = await res.json();
  return data?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
}

async function fetchVideos(channelId, type) {
  const playlistId = await getUploadsPlaylist(channelId);
  if (!playlistId) return [];

  const res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=20&playlistId=${playlistId}&key=${apiKey}`);
  const data = await res.json();

  return (data.items || []).map(item => ({
    title: item.snippet.title,
    youtube_id: item.snippet.resourceId.videoId,
    thumbnail: item.snippet.thumbnails.medium.url,
    type,
    created_at: item.snippet.publishedAt
  }));
}

export const handler = async () => {
  console.log("🟢 Scheduled trailer sync running");

  let allVideos = [];

  for (const channel of channels) {
    const videos = await fetchVideos(channel.id, channel.type);
    allVideos.push(...videos);
  }

  const { data: existing } = await supabase.from('trailers').select('youtube_id');
  const existingIds = new Set((existing || []).map(v => v.youtube_id));

  const newVideos = allVideos.filter(video => !existingIds.has(video.youtube_id));

  if (newVideos.length > 0) {
    const { error } = await supabase.from('trailers').insert(newVideos);
    if (error) {
      console.error("❌ Supabase insert error:", error);
    } else {
      console.log(`✅ Inserted ${newVideos.length} new trailers`);
    }
  } else {
    console.log("📭 No new trailers to insert");
  }
  await supabase.from('meta').upsert({
    key: 'last_trailer_sync',
    value: new Date().toISOString()
  }, { onConflict: 'key' });
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Sync complete" })
  };
};

