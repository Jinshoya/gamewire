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
  { id: 'UCEScTo5Hk1YXsCqGW1zgQEw', type: 'russian' }
];

async function getUploadsPlaylist(channelId) {
  const url = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`;
  console.log(`🔍 Fetching uploads playlist for channel: ${channelId}`);
  
  const res = await fetch(url);
  const data = await res.json();
  
  // 🚨 DEBUG: Log the API response
  console.log(`📡 API Response for ${channelId}:`, JSON.stringify(data, null, 2));
  
  if (data.error) {
    console.error(`❌ YouTube API Error for ${channelId}:`, data.error);
    return null;
  }
  
  const playlistId = data?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  console.log(`📋 Playlist ID for ${channelId}: ${playlistId}`);
  
  return playlistId;
}

async function fetchVideos(channelId, type) {
  console.log(`🎬 Fetching videos for ${type} channel: ${channelId}`);
  
  const playlistId = await getUploadsPlaylist(channelId);
  if (!playlistId) {
    console.log(`⚠️ No playlist found for ${channelId}`);
    return [];
  }

  const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=20&playlistId=${playlistId}&key=${apiKey}`;
  console.log(`🔍 Fetching playlist items: ${playlistId}`);
  
  const res = await fetch(url);
  const data = await res.json();
  
  // 🚨 DEBUG: Log playlist response
  console.log(`📡 Playlist Response for ${playlistId}:`, JSON.stringify(data, null, 2));
  
  if (data.error) {
    console.error(`❌ YouTube API Error for playlist ${playlistId}:`, data.error);
    return [];
  }

  const videos = (data.items || []).map(item => ({
    title: item.snippet.title,
    youtube_id: item.snippet.resourceId.videoId,
    thumbnail: item.snippet.thumbnails.medium.url,
    type,
    created_at: item.snippet.publishedAt
  }));
  
  console.log(`📹 Found ${videos.length} videos for ${type} channel`);
  return videos;
}

export const handler = async () => {
  console.log("🟢 Scheduled trailer sync running at:", new Date().toISOString());
  console.log("🔑 API Key exists:", !!apiKey);
  console.log("🗄️ Supabase URL exists:", !!process.env.VITE_SUPABASE_URL);

  let allVideos = [];

  for (const channel of channels) {
    try {
      const videos = await fetchVideos(channel.id, channel.type);
      allVideos.push(...videos);
      console.log(`✅ Processed ${videos.length} videos from ${channel.type} channel`);
    } catch (error) {
      console.error(`❌ Error processing ${channel.type} channel:`, error);
    }
  }

  console.log(`📊 Total videos fetched: ${allVideos.length}`);

  // Check existing videos
  const { data: existing, error: selectError } = await supabase.from('trailers').select('youtube_id');
  
  if (selectError) {
    console.error("❌ Error fetching existing trailers:", selectError);
    return { statusCode: 500, body: "Database error" };
  }
  
  const existingIds = new Set((existing || []).map(v => v.youtube_id));
  console.log(`📋 Existing trailers in DB: ${existingIds.size}`);

  const newVideos = allVideos.filter(video => !existingIds.has(video.youtube_id));
  console.log(`🆕 New videos to insert: ${newVideos.length}`);

  if (newVideos.length > 0) {
    console.log("🔄 Inserting new videos:", newVideos.map(v => v.title));
    
    // Use upsert to handle duplicates automatically
    const { error, data } = await supabase
      .from('trailers')
      .upsert(newVideos, { 
        onConflict: 'youtube_id',
        ignoreDuplicates: true 
      });
    
    if (error) {
      console.error("❌ Supabase upsert error:", error);
      return { statusCode: 500, body: "Upsert failed" };
    } else {
      console.log(`✅ Successfully processed ${newVideos.length} trailers (duplicates ignored)`);
    }
  } else {
    console.log("📭 No new trailers to insert");
  }
  
  // Update timestamp
  const { error: metaError } = await supabase.from('meta').upsert({
    key: 'last_trailer_sync',
    value: new Date().toISOString()
  }, { onConflict: 'key' });
  
  if (metaError) {
    console.error("❌ Error updating timestamp:", metaError);
  } else {
    console.log("⏰ Updated last sync timestamp");
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ 
      message: "Sync complete",
      totalFetched: allVideos.length,
      newInserted: newVideos.length
    })
  };
};