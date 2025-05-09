import React from 'react';
import ReactDOM from 'react-dom/client';
import TwitchQueueApp from './TwitchQueueApp.jsx';

const root = document.getElementById('twitch-root');
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <TwitchQueueApp />
  </React.StrictMode>
);
