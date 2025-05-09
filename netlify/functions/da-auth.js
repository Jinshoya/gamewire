export async function handler(event) {
  const code = event.queryStringParameters.code;

  if (!code) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing code parameter' }),
    };
  }

  const client_id = process.env.VITE_DONATIONALERTS_CLIENT_ID;
  const client_secret = process.env.DONATIONALERTS_CLIENT_SECRET;
  const redirect_uri = 'http://localhost:5173/callback.html'; // Must match app settings

  try {
    const response = await fetch('https://www.donationalerts.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id,
        client_secret,
        redirect_uri,
        code,
      }),
    });

    const data = await response.json();

    if (!data.access_token) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'No access token returned', details: data }),
      };
    }

    const userRes = await fetch('https://www.donationalerts.com/api/v1/user/oauth', {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });

    const user = await userRes.json();

    return {
      statusCode: 200,
      body: JSON.stringify({ token: data, user }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Token exchange failed', message: err.message }),
    };
  }
}
