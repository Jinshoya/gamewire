export default async (req, context) => {
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }
  
    const { eventId, emoji } = await req.json();
    if (!eventId || !emoji) {
      return new Response('Missing data', { status: 400 });
    }
  
    const key = `reaction:${eventId}`;
    let data = await context.kv.get(key, { type: 'json' }) || {};
  
    data[emoji] = (data[emoji] || 0) + 1;
  
    await context.kv.set(key, JSON.stringify(data));
  
    return new Response(JSON.stringify({ success: true, reactions: data }), {
      headers: { 'Content-Type': 'application/json' }
    });
  };
  