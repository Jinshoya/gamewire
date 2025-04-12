export async function handler(event, context) {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }
  
    const { eventId, emoji, undo } = JSON.parse(event.body || '{}');
  
    const key = `reaction:${eventId}`;
    let data = await context.kv.get(key, { type: 'json' }) || {};
  
    data[emoji] = (data[emoji] || 0) + (undo ? -1 : 1);
    if (data[emoji] < 0) data[emoji] = 0;
  
    await context.kv.set(key, JSON.stringify(data));
  
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, reactions: data }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
  