import React, { useEffect, useRef, useState } from 'react';

const LOCAL_QUEUE_KEY = 'twitchQueueList';
const LOCAL_SETTINGS_KEY = 'twitchQueueSettings';

const DEFAULT_SETTINGS = {
  skipPhrase: '!skip',
  dontSkipPhrase: '!dontskip',
  skipThreshold: 3,
  modSkipPhrase: '!modskip',
  voteCooldownSec: 10,
  donationModeOnly: false
};

const TwitchQueueApp = () => {
  const [queue, setQueue] = useState([]);
  const [connected, setConnected] = useState(false);
  const [username, setUsername] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [popupVideoId, setPopupVideoId] = useState(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(null);
  const [queueLoaded, setQueueLoaded] = useState(false);
  const [loop, setLoop] = useState(false);
  const [skipVoters, setSkipVoters] = useState([]);
  const [debugLog, setDebugLog] = useState([]);
const [donationConnected, setDonationConnected] = useState(false);
    const DONATION_REDIRECT = window.location.origin + window.location.pathname;

  
  const logoutTwitch = () => {
    localStorage.removeItem('twitchAccessToken');
    window.location.reload();
  };

  const logoutDonationAlerts = () => {
    localStorage.removeItem('donationAlertsToken');
    setDonationConnected(false);
    window.location.reload();
  };


  const startDonationLogin = () => {
    const scope = 'oauth-donation-subscribe oauth-user-show';
    const redirect = `${window.location.origin}/callback.html`;
    const clientId = '14865'; // Your actual APP ID
  
    localStorage.setItem('redirectAfterLogin', window.location.pathname + '#donationalerts');
  
    // Use response_type=token for the implicit grant flow
    window.location.href = `https://www.donationalerts.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirect)}&response_type=token&scope=${encodeURIComponent(scope)}`;
  };
  
  
  
  

  
useEffect(() => {
  const hash = window.location.hash;
  const params = new URLSearchParams(hash.substring(1));
  const token = params.get('access_token') || localStorage.getItem('twitchAccessToken');

  if (token) {
    accessTokenRef.current = token;

    fetch('https://api.twitch.tv/helix/users', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Client-ID': import.meta.env.VITE_TWITCH_CLIENT_ID,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        const user = data.data[0];
        setUsername(user.login);
        channelNameRef.current = user.login;
        setAvatarUrl(user.profile_image_url);
        if (queueLoaded) connectToChat(token, user.login);
        localStorage.setItem('twitchAccessToken', token);

        if (hash.includes('access_token')) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      });
  }
}, [queueLoaded]);


useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1));
      const daToken = params.get('access_token');
      if (daToken) {
        localStorage.setItem('donationAlertsToken', daToken);
        setDonationConnected(true);
        addDebugLog('🎁 Connected to DonationAlerts');
        connectDonationSocket(daToken);
      }
    } else {
      const stored = localStorage.getItem('donationAlertsToken');
      if (stored) {
        setDonationConnected(true);
        connectDonationSocket(stored);
      }
    }
  }, []);

  const connectDonationSocket = (socketToken) => {
    console.log("🔌 Connecting to DonationAlerts WebSocket...");
    const socket = new WebSocket('wss://socket.donationalerts.ru:443');
    socketRef.current = socket;
  
    socket.onopen = () => {
      const user = JSON.parse(localStorage.getItem('donationAlertsUser'));
      const userId = user?.data?.id;
  
      console.log("📡 DA socket token:", socketToken);
      console.log("🆔 DA user ID:", userId);
  
      if (!userId) {
        addDebugLog("❌ No DonationAlerts user ID found.");
        return;
      }
  
      socket.send(JSON.stringify({
        type: 'donation_alerts:subscribe',
        data: {
          token: socketToken,
          user_id: userId
        }
      }));
  
      setDonationConnected(true);
      addDebugLog('📡 Subscribed to Donation WebSocket');
    };
  
    socket.onmessage = (event) => {
      console.log("📩 Incoming Donation WebSocket payload:", event.data);
      const payload = JSON.parse(event.data);
  
      if (payload.type === 'donation') {
        const { username, message, amount, currency } = payload.data;
        const sender = username || 'Anonymous';
        addDebugLog(`🎁 Donation from ${sender}: ${amount} ${currency}`);
        // Handle your donation logic here
      }
    };
  
    socket.onerror = (err) => {
      console.error("❌ Donation WebSocket error:", err);
      addDebugLog('❌ WebSocket error: ' + (err?.message || '[no message]'));
    };
  };
  
  
   // replace me
  

  

  const [showSettings, setShowSettings] = useState(false);

  const accessTokenRef = useRef(null);
  const socketRef = useRef(null);
  const seenVideoIds = useRef(new Set());
  const settings = useRef(DEFAULT_SETTINGS);
  const channelNameRef = useRef(null);
  const playingIndexRef = useRef(null);
  const voteCooldownMap = useRef({});
  const [userSettings, setUserSettings] = useState(() => {
    const saved = localStorage.getItem(LOCAL_SETTINGS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        settings.current = { ...DEFAULT_SETTINGS, ...parsed };
        return { ...DEFAULT_SETTINGS, ...parsed };
      } catch {
        return DEFAULT_SETTINGS;
      }
    }
    settings.current = DEFAULT_SETTINGS;
    return DEFAULT_SETTINGS;
  });
  
  useEffect(() => {
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(userSettings));
    settings.current = { ...userSettings };
  }, [userSettings]);

  const addDebugLog = (message) => {
    console.log(message);
    setDebugLog((prev) => [...prev.slice(-9), message]);
  };

  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_QUEUE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setQueue(parsed);
          parsed.forEach((item) => seenVideoIds.current.add(item.id));
        }
      } catch {
        console.warn('Invalid saved queue');
      }
    }
    setQueueLoaded(true);
  }, []);

  useEffect(() => {
    if (queueLoaded && queue.length > 0) {
      localStorage.setItem(LOCAL_QUEUE_KEY, JSON.stringify(queue));
    }
  }, [queue, queueLoaded]);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('access_token');
      if (token) {
        accessTokenRef.current = token;
        fetch('https://api.twitch.tv/helix/users', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Client-ID': import.meta.env.VITE_TWITCH_CLIENT_ID,
          },
        })
          .then((res) => res.json())
          .then((data) => {
            const user = data.data[0];
            setUsername(user.login);
            channelNameRef.current = user.login;
            setAvatarUrl(user.profile_image_url);
            if (queueLoaded) connectToChat(token, user.login);
            // ✅ Clean token after using it
            window.history.replaceState({}, document.title, window.location.pathname);
          });
      }
      if (token) {
        accessTokenRef.current = token;
        fetch('https://api.twitch.tv/helix/users', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Client-ID': import.meta.env.VITE_TWITCH_CLIENT_ID,
          },
        })
          .then((res) => res.json())
          .then((data) => {
            const user = data.data[0];
            setUsername(user.login);
            channelNameRef.current = user.login;
            setAvatarUrl(user.profile_image_url);
            if (queueLoaded) connectToChat(token, user.login);
          });
      }
    }
  }, [queueLoaded]);

  const startTwitchLogin = () => {
    const clientId = import.meta.env.VITE_TWITCH_CLIENT_ID;
    const redirect = `${window.location.origin}/callback.html`;
    const scope = 'chat:read';
  
    // ✅ Store current path so we can return to it after login
    localStorage.setItem('redirectAfterLogin', window.location.pathname);
  
    window.location.href = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirect}&response_type=token&scope=${scope}`;
  };
  

  const connectToChat = (token, user) => {
    const socket = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
    socketRef.current = socket;

    socket.onopen = () => {
      socket.send('PASS oauth:' + token);
      socket.send('NICK ' + user);
      socket.send('JOIN #' + user);
      setConnected(true);
      addDebugLog(`Connected to chat as ${user}`);
    };

    socket.onmessage = (event) => {
      if (!event.data.includes('PRIVMSG')) return;

      const message = event.data;
      const sender = message.split('!')[0].slice(1).toLowerCase();
      const text = message.split('PRIVMSG')[1].split(':').slice(1).join(':').trim();
      const isModOrBroadcaster = sender === channelNameRef.current;

      addDebugLog(`[CHAT] ${sender}: ${text} (isMod: ${isModOrBroadcaster})`);
      handleMessage(text, sender, isModOrBroadcaster);
    };
  };

  const fetchTitle = async (id) => {
    try {
      const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
      const data = await res.json();
      return data.title;
    } catch {
      return 'Unknown Title';
    }
  };

  const handleMessage = async (text, sender, isModOrBroadcaster = false) => {
  const lowerText = text.toLowerCase();

  const modSkipCmd = settings.current.modSkipPhrase.toLowerCase();
  if (lowerText.startsWith(modSkipCmd) && (isModOrBroadcaster || sender === channelNameRef.current)) {
    addDebugLog(`🛡️ MODSKIP triggered by ${sender}`);
    skipCurrentVideo();
    return;
  }

  const now = Date.now();
  const lastVote = voteCooldownMap.current[sender] || 0;
  if (now - lastVote < settings.current.voteCooldownSec * 1000) {
    addDebugLog(`${sender} is on cooldown`);
    return;
  }
  voteCooldownMap.current[sender] = now;

  const skipCmd = settings.current.skipPhrase.toLowerCase();
  const dontSkipCmd = settings.current.dontSkipPhrase.toLowerCase();

  if (lowerText.startsWith(skipCmd)) {
    setSkipVoters((prev) => {
      if (!prev.includes(sender)) {
        const updated = [...prev, sender];
        addDebugLog(`Skip vote by ${sender} (${updated.length}/${settings.current.skipThreshold})`);
        return updated;
      }
      return prev;
    });
    return;
  }

  if (lowerText.startsWith(dontSkipCmd)) {
    setSkipVoters((prev) => {
      const updated = prev.filter((u) => u !== sender);
      addDebugLog(`${sender} removed skip vote`);
      return updated;
    });
    return;
  }

  const ytRegex = /https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/;
  const match = text.match(ytRegex);
  if (match) {
    if (settings.current.donationModeOnly) {
      addDebugLog('🎁 Donation mode ON – ignoring chat video');
      return;
    }

    const id = match[3];
    if (seenVideoIds.current.has(id)) return;

    const alreadyQueuedByUser = queue.some(item => item.requester === sender);
    if (alreadyQueuedByUser) {
      addDebugLog(`❌ ${sender} already has a video in the queue`);
      return;
    }

    seenVideoIds.current.add(id);
    const title = await fetchTitle(id);
    if (!title) return;
    setQueue((prev) => [...prev, { id, title, requester: sender }]);
    addDebugLog(`✅ Added to queue: ${title} (by ${sender})`);
  }
};

  useEffect(() => {
    if (skipVoters.length >= settings.current.skipThreshold) {
      addDebugLog(`Skip threshold reached!`);
      skipCurrentVideo();
    }
  }, [skipVoters]);

  const skipCurrentVideo = () => {
    if (queue.length === 0) {
      addDebugLog("Queue is empty, nothing to skip");
      return;
    }

    const currentIndex = playingIndexRef.current;

    if (currentIndex === null) {
      addDebugLog("MODSKIP: Starting first video");
      playIndex(0);
      return;
    }

    const nextIndex = currentIndex + 1;

    if (nextIndex < queue.length) {
      addDebugLog(`MODSKIP: Skipping to video ${nextIndex}`);
      playIndex(nextIndex);
    } else {
      addDebugLog("MODSKIP: End of queue reached, closing player");
      setCurrentVideoIndex(null);
      playingIndexRef.current = null;
      setPopupVideoId(null);
      setShowPopup(false);
      setSkipVoters([]);
    }
  };

  const playIndex = (index) => {
    if (index < 0 || index >= queue.length) {
      addDebugLog(`Invalid index: ${index}`);
      return;
    }

    setSkipVoters([]);
    setCurrentVideoIndex(index);
    playingIndexRef.current = index;
    setPopupVideoId(queue[index].id);
    setShowPopup(true);
    addDebugLog(`Playing: ${queue[index].title} (index: ${index})`);
  };

  const clearQueue = () => {
    setQueue([]);
    seenVideoIds.current.clear();
    localStorage.removeItem(LOCAL_QUEUE_KEY);
    setCurrentVideoIndex(null);
    playingIndexRef.current = null;
    setPopupVideoId(null);
    setShowPopup(false);
    setSkipVoters([]);
    addDebugLog("Queue cleared");
  };

  const removeItem = (index) => {
    setQueue((prev) => {
      const newQueue = [...prev];
      const removed = newQueue.splice(index, 1)[0];

      if (index === playingIndexRef.current) {
        if (newQueue.length > 0) {
          setTimeout(() => playIndex(Math.min(index, newQueue.length - 1)), 0);
        } else {
          setCurrentVideoIndex(null);
          playingIndexRef.current = null;
          setPopupVideoId(null);
          setShowPopup(false);
        }
      } else if (playingIndexRef.current !== null && index < playingIndexRef.current) {
        setCurrentVideoIndex((i) => (i !== null ? i - 1 : null));
        playingIndexRef.current -= 1;
      }

      seenVideoIds.current.delete(removed.id);
      addDebugLog(`Removed: ${removed.title}`);
      return newQueue;
    });
  };

  const closePlayer = () => {
    setShowPopup(false);
    setPopupVideoId(null);
    setCurrentVideoIndex(null);
    playingIndexRef.current = null;
    setSkipVoters([]);
    addDebugLog("Closed player");
  };

  return (
    <div style={{ padding: '20px', color: '#fff' }}>
      <h1>🎥 Twitch YouTube Queue</h1>

      {!connected ? (
        <button onClick={startTwitchLogin}>Login with Twitch</button>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {avatarUrl && <img src={avatarUrl} style={{ width: 40, height: 40, borderRadius: '50%' }} />}
          <strong>Welcome, {username}</strong>
          <button onClick={logoutTwitch}>Logout Twitch</button>
          <button onClick={clearQueue}>Clear Queue</button>
          {!donationConnected ? (
  <button onClick={startDonationLogin}>Login with DonationAlerts</button>
) : (
  <>
    <strong>DonationAlerts Connected ✅</strong>
    <button onClick={logoutDonationAlerts} style={{ marginLeft: '10px' }}>Logout DA</button>
  </>
)}

        </div>
      )}

      
      


      
      <button onClick={() => setShowSettings(true)} style={{ marginTop: 20 }}>⚙️ Voting Settings</button>

      {showSettings && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#222',
          padding: '20px',
          borderRadius: '10px',
          zIndex: 1000,
          color: '#fff'
        }}>
          <h3>⚙️ Voting Settings</h3>
          <label>Skip Phrase: </label>
          <input value={userSettings.skipPhrase} onChange={(e) => setUserSettings(prev => ({ ...prev, skipPhrase: e.target.value }))} />
          <br />
          <label>Don't Skip Phrase: </label>
          <input value={userSettings.dontSkipPhrase} onChange={(e) => setUserSettings(prev => ({ ...prev, dontSkipPhrase: e.target.value }))} />
          <br />
          <label>Skip Threshold: </label>
          <input type="number" value={userSettings.skipThreshold} onChange={(e) => setUserSettings(prev => ({ ...prev, skipThreshold: parseInt(e.target.value || '1') }))} />
          <br />
          <label>Cooldown (seconds): </label>
<input
  type="number"
  value={userSettings.voteCooldownSec}
  onChange={(e) =>
    setUserSettings((prev) => ({
      ...prev,
      voteCooldownSec: parseInt(e.target.value || '1'),
    }))
  }
/>
<br />
<label>
  <input
    type="checkbox"
    checked={userSettings.donationModeOnly}
    onChange={(e) =>
      setUserSettings((prev) => ({
        ...prev,
        donationModeOnly: e.target.checked,
      }))
    }
  />
  Only accept videos from donations
</label>
          <br /><br />
          <button onClick={() => {
            localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(userSettings));
            settings.current = { ...userSettings };
            setShowSettings(false);
            addDebugLog('✅ Settings saved');
          }}>💾 Save Settings</button>
          <button onClick={() => setShowSettings(false)} style={{ marginLeft: 10 }}>❌ Cancel</button>
        </div>
      )}


      <h2>Queue:</h2>
      {queue.length === 0 ? (
        <p>Queue is empty.</p>
      ) : (
        <ul>
          {queue.map((item, i) => (
            <li key={i}>
              <span
                onClick={() => playIndex(i)}
                style={{
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontWeight: currentVideoIndex === i ? 'bold' : 'normal',
                  marginRight: '10px'
                }}
              >
                {i === currentVideoIndex && '▶️ '}
                {item.title} {item.requester ? `(by ${item.requester})` : ''}
              </span>
              <button onClick={() => removeItem(i)}>❌</button>
            </li>
          ))}
        </ul>
      )}

      {showPopup && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column',
            zIndex: 1000
          }}
          onClick={closePlayer}
        >
          <div style={{ width: '80%', maxWidth: 960 }} onClick={(e) => e.stopPropagation()}>
            <iframe
              width="100%"
              height="540"
              src={`https://www.youtube.com/embed/${popupVideoId}?autoplay=1`}
              frameBorder="0"
              allow="autoplay; encrypted-media"
              allowFullScreen
              title="YouTube Video"
            />
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center', gap: 20 }}>
              <button
                onClick={skipCurrentVideo}
                style={{
                  background: skipVoters.length >= settings.current.skipThreshold ? 'green' : '#333',
                  color: '#fff',
                  padding: '10px 20px',
                  fontSize: '18px',
                  borderRadius: '10px',
                  cursor: 'pointer'
                }}
              >
                ⏭ SKIP ({skipVoters.length}/{settings.current.skipThreshold})
              </button>
            </div>
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between' }}>
              <p>Now playing: {queue[playingIndexRef.current]?.title}</p>
              <div>
                <button onClick={() => setLoop(!loop)}>{loop ? '🔁 Looping' : '🔁 Loop Off'}</button>
                <button onClick={closePlayer}>❌ Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      
    </div>
  );
};

export default TwitchQueueApp;
