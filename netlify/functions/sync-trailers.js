import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

console.log("🟢 Starting sync-trailers script...");

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const apiKey = process.env.VITE_YOUTUBE_API_KEY;

const gameChannelId = 'UCJx5KP-pCUmL9eZUv-mIcNw';
const movieChannelId = 'UCi8e0iOVk1fEOogdfu4YgfA';
const russianMovieChannelId = 'UC6A-Z0jDKemh9-CwGbj5yog';

const now = new Date();
const oneMonthAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(); // 60 days ago

async function getUploadsPlaylist(channelId) {
  const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`);
  const data = await res.json();
  return data?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
}

async function fetchVideosFromChannel(channelId, type) {
  const playlistId = await getUploadsPlaylist(channelId);
  if (!playlistId) {
    console.error(`❌ Could not get uploads playlist for ${channelId}`);
    return [];
  }

  const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=20&playlistId=${playlistId}&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();

  if (!data.items) {
    console.error(`❌ No items returned from playlist ${playlistId}`);
    return [];
  }

  const trailers = data.items.map(item => ({
    title: item.snippet.title,
    youtube_id: item.snippet.resourceId.videoId,
    thumbnail: item.snippet.thumbnails.medium.url,
    type,
    created_at: item.snippet.publishedAt,
  }));

  return trailers;
}

async function syncTrailers() {
  const gameTrailers = await fetchVideosFromChannel(gameChannelId, 'game');
  const movieTrailers = await fetchVideosFromChannel(movieChannelId, 'movie');
  const russianTrailers = await fetchVideosFromChannel(russianMovieChannelId, 'russian');

  const allTrailers = [...gameTrailers, ...movieTrailers, ...russianTrailers];

  const { data: existing } = await supabase.from('trailers').select('youtube_id');
  const existingIds = new Set(existing.map(tr => tr.youtube_id));

  const newEntries = allTrailers.filter(trailer => !existingIds.has(trailer.youtube_id));

  if (newEntries.length === 0) {
    console.log("📭 No new trailers to insert.");
    return;
  }

  const { error } = await supabase.from('trailers').insert(newEntries);

  if (error) {
    console.error("❌ Error inserting new trailers:", error.message);
  } else {
    console.log(`✅ Inserted ${newEntries.length} new trailers.`);
  }
}

syncTrailers();
