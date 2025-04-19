// netlify/functions/sync-trailers.js
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const apiKey = process.env.VITE_YOUTUBE_API_KEY;

const gameChannelId = 'UCJx5KP-pCUmL9eZUv-mIcNw';
const movieChannelId = 'UCi8e0iOVk1fEOogdfu4YgfA';
const russianMovieChannelId = 'UC6A-Z0jDKemh9-CwGbj5yog';

async function getUploadsPlaylist(channelId) {
  const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`);
  const data = await res.json();
  return data?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
}

async function fetchVideosFromChannel(channelId, type) {
  const playlistId = await getUploadsPlaylist(channelId);
  if (!playlistId) return [];

  const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=20&playlistId=${playlistId}&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();

  return (data.items || []).map(item => ({
    title: item.snippet.title,
    youtube_id: item.snippet.resourceId.videoId,
    thumbnail: item.snippet.thumbnails.medium.url,
    type,
    created_at: item.snippet.publishedAt,
  }));
}

async function syncTrailers() {
  const gameTrailers = await fetchVideosFromChannel(gameChannelId, 'game');
  const movieTrailers = await fetchVideosFromChannel(movieChannelId, 'movie');
  const russianTrailers = await fetchVideosFromChannel(russianMovieChannelId, 'russian');

  const allTrailers = [...gameTrailers, ...movieTrailers, ...russianTrailers];

  const { data: existing } = await supabase.from('trailers').select('youtube_id');
  const existingIds = new Set((existing || []).map(tr => tr.youtube_id));
  const newEntries = allTrailers.filter(trailer => !existingIds.has(trailer.youtube_id));

  if (newEntries.length > 0) {
    const { error } = await supabase.from('trailers').insert(newEntries);
    if (error) console.error("❌ Insert error:", error);
    else console.log(`✅ Inserted ${newEntries.length} new trailers.`);
  } else {
    console.log("📭 No new trailers.");
  }
}

export const handler = async () => {
  console.log("🕒 Running scheduled trailer sync...");
  await syncTrailers();
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Trailers synced successfully." })
  };
};
