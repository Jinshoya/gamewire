export async function handler(event, context) {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }
  
    try {
      const { eventId, emoji, undo } = JSON.parse(event.body || '{}');
  
      if (!eventId || !emoji) {
        return {
          statusCode: 400,
          body: 'Missing eventId or emoji'
        };
      }
  
      const key = `reaction:${eventId}`;
      let data = await context.kv.get(key, { type: 'json' }) || {};
  
      data[emoji] = data[emoji] || 0;
      data[emoji] = Math.max(0, data[emoji] + (undo ? -1 : 1));
  
      await context.kv.set(key, JSON.stringify(data));
  
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, reactions: data }),
        headers: {
          'Content-Type': 'application/json'
        }
      };
    } catch (err) {
      return {
        statusCode: 500,
        body: `Internal Error: ${err.message}`
      };
    }
  }
  