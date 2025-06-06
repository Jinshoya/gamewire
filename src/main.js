import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabaseClient.js';
if (window.location.pathname.includes("trailers")) {
  import('./trailers.js');
}

import { injectNavbar } from './components/navbar.js';

injectNavbar(); // adds it to every page

async function trackPageView() {
const path = window.location.pathname;
const visitorId = localStorage.getItem('ggp_visitor_id') || null;

const { error } = await supabase.from('page_views').insert([
{ path, visitor_id: visitorId } // only if you added that column
]);

if (error) {
console.error('❌ Page view track failed:', error);
} else {
console.log('📈 Page view recorded:', path);
}
}

async function trackVisitor() {
let visitorId = localStorage.getItem('ggp_visitor_id');

if (!visitorId) {
visitorId = crypto.randomUUID();
localStorage.setItem('ggp_visitor_id', visitorId);

const { error } = await supabase.from('visitors').insert([
  { id: visitorId }
]);

if (error) {
  console.error('❌ Visitor insert failed:', error);
} else {
  console.log('✅ New visitor tracked:', visitorId);
}
} else {
console.log('🧠 Returning visitor:', visitorId);

const { error } = await supabase
  .from('visitors')
  .update({ last_seen: new Date().toISOString() })
  .eq('id', visitorId);

if (error) {
  console.error('⚠️ Failed to update last_seen:', error);
} else {
  console.log('✅ last_seen updated');
}
}
}




function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function parseFrontmatter(md) {
const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/m.exec(md);
if (!match) return { attributes: {}, body: md };

try {
const attributes = jsyaml.load(match[1]); // Use js-yaml to properly parse nested objects
return { attributes, body: match[2] };
} catch (e) {
console.error("Failed to parse frontmatter YAML:", e);
return { attributes: {}, body: md };
}
}


function renderLinks(data) {
console.log("🧠 renderLinks CALLED for:", data.title);

const links = [];

const tryPush = (entry, label, icon) => {
if (entry?.url) {
  console.log(`✅ ${label} LINK FOUND:`, entry.url);
  links.push({
    url: entry.url,
    icon: entry.icon || icon,
    label
  });
}
};

tryPush(data.youtube, 'YouTube', '/images/links/youtube_link.png');
tryPush(data.twitch, 'Twitch', '/images/links/twitch_link.png');
tryPush(data.website, 'Website', '/images/links/web_link.png');

if (data.type === 'steam_sale') {
tryPush(data.steam, 'Steam', '/images/links/steam_link.png');
}

if (Array.isArray(data.links)) {
data.links.forEach((link, i) => {
  if (link.url) {
    links.push({
      url: link.url,
      icon: link.icon || '/images/links/web_link.png',
      label: link.label || `Link ${i + 1}`
    });
  }
});
}

if (links.length === 0) {
console.warn(`🚫 No valid links found for ${data.title}`);
return `<div class="event_links"><img src="/images/links/lock_icon.png" title="Links not available yet" style="opacity: 0.5;" /></div>`;
}

return `
<div class="event_links">
  ${links.map(link => `
    <a href="${link.url}" target="_blank" title="${link.label}">
      <img src="${link.icon}" class="links_image" alt="${link.label}" />
    </a>
  `).join('')}
</div>`;
}




async function react(button, emoji) {
  const wrapper = button.closest('.reaction-bar');
  if (!wrapper) return console.error('Reaction wrapper not found');
  const eventId = wrapper.getAttribute('data-event');
  const storageKey = `reaction_${eventId}`;
  const current = localStorage.getItem(storageKey);

  const { data: reactions } = await supabase.from('reactions').select('emoji, count').eq('event_id', eventId);
  const prev = reactions.find(r => r.emoji === current);
  const curr = reactions.find(r => r.emoji === emoji);

  if (current === emoji) {
    if (curr?.count > 1) {
      await supabase.from('reactions').update({ count: curr.count - 1 }).eq('event_id', eventId).eq('emoji', emoji);
    } else {
      await supabase.from('reactions').delete().eq('event_id', eventId).eq('emoji', emoji);
    }
    localStorage.removeItem(storageKey);
    wrapper.querySelectorAll('button').forEach(btn => btn.classList.remove('reacted'));
    await refreshReactionCounts(eventId, wrapper);
    return;
  }

  if (current && prev) {
    if (prev.count > 1) {
      await supabase.from('reactions').update({ count: prev.count - 1 }).eq('event_id', eventId).eq('emoji', current);
    } else {
      await supabase.from('reactions').delete().eq('event_id', eventId).eq('emoji', current);
    }
  }

  if (curr) {
    await supabase.from('reactions').update({ count: curr.count + 1 }).eq('event_id', eventId).eq('emoji', emoji);
  } else {
    await supabase.from('reactions').insert({ event_id: eventId, emoji, count: 1 });
  }

  localStorage.setItem(storageKey, emoji);
  wrapper.querySelectorAll('button').forEach(btn => {
    const e = btn.getAttribute('data-emoji');
btn.classList.toggle('reacted', e === emoji);

if (e === emoji) {
// Apply bounce animation
btn.style.animation = 'none'; // Reset in case it's already applied
void btn.offsetWidth; // Force reflow to restart animation
btn.style.animation = 'reactPop 0.4s ease';
}
});

  await refreshReactionCounts(eventId, wrapper);
}
window.react = react;  
async function refreshReactionCounts(eventId, wrapper) {
const { data } = await supabase
.from('reactions')
.select('emoji, count')
.eq('event_id', eventId);

const selected = localStorage.getItem(`reaction_${eventId}`);

wrapper.querySelectorAll('button').forEach(btn => {
const emoji = btn.getAttribute('data-emoji'); // ✅ CORRECT way
const found = data.find(r => r.emoji === emoji);
btn.querySelector('span').textContent = found?.count ?? 0;
btn.classList.toggle('reacted', emoji === selected); // ✅ compare with stored
});
}

function startCountdowns() {
  setInterval(() => {
    const nowUtcTime = Date.now(); // Get current time in UTC milliseconds. This is consistent globally.
    let soonestTimeLeft = Infinity;
    let soonestEventTitle = '';
    let nowLiveTitle = '';

    document.querySelectorAll('.countdown').forEach(el => {
      // IMPORTANT: Ensure 'data-start-event-date' and 'data-end-event-date'
      // attributes contain ISO 8601 formatted UTC date strings (e.g., "2025-06-07T10:00:00Z").
      // If they don't include a timezone (like "Z" for UTC), new Date() will parse them
      // as local time, leading to inconsistent countdowns.
      const start = new Date(el.getAttribute('data-start-event-date'));
      const endStr = el.getAttribute('data-end-event-date');
      const end = endStr ? new Date(endStr) : null;

      // Calculate diff and elapsed using UTC timestamps from the Date objects.
      // .getTime() returns milliseconds since epoch, which is UTC-based.
      const diff = start.getTime() - nowUtcTime;
      const elapsed = nowUtcTime - start.getTime();
      const parent = el.closest('.event_block');
      const isSteam = parent.closest('#steam-sale-event');

      // Track soonest upcoming event
      if (diff > 0 && diff < soonestTimeLeft) {
        soonestTimeLeft = diff;
        const block = el.closest('.event_block');
        soonestEventTitle = block?.querySelector('.event_upc_title')?.textContent || 'Upcoming Event';
      }

      // Glow if less than 1 hour
      if (diff > 0 && diff < 3600000) {
        el.classList.add("glowing");
      } else {
        el.classList.remove("glowing");
      }

      // Steam sale removal if ended
      if (isSteam && end && nowUtcTime >= end.getTime()) {
        return parent.remove();
      }

      // If already started
      if (diff <= 0) {
        if (elapsed >= 3600000) {
          // Move to past
          if (parent.parentElement.id !== 'past-events') {
            document.getElementById('past-events').appendChild(parent);
          }

          parent.classList.add('event_past');
          parent.classList.remove('now_live');
          el.innerHTML = '';

          const reactionBar = parent.querySelector('.reaction-bar');
          if (reactionBar) reactionBar.classList.add('reactions-disabled');
        } else {
          // It's LIVE
          el.innerHTML = `
<div class="event_countdown live-tag">
<span class="live-dot"></span>
<span class="live-text">NOW LIVE</span>
</div>
`;

          if (parent.parentElement.id !== 'live-events') {
            document.getElementById('live-events').appendChild(parent);
            setTimeout(() => hideEmptySections(), 10);
          }

          parent.classList.add('now_live');
          parent.classList.remove('event_past');

          const reactionBar = parent.querySelector('.reaction-bar');
          if (reactionBar) reactionBar.classList.remove('reactions-disabled');

          const block = el.closest('.event_block');
          nowLiveTitle = block?.querySelector('.event_upc_title')?.textContent || 'Now Live';
        }
        return;
      }

      // Show countdown
      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const mins = Math.floor((totalSeconds % 3600) / 60);
      const secs = totalSeconds % 60;

      el.innerHTML = `
    <div class="event_countdown">
      Starting in
      <span class="number">${days}</span><span class="unit">d</span>
      <span class="number">${hours}</span><span class="unit">h</span>
      <span class="number">${mins}</span><span class="unit">m</span>
      <span class="number">${secs}</span><span class="unit">s</span>
    </div>
  `;
    });

// 🔁 Set page title
// These calculations for the page title will now also be based on the globally unified 'soonestTimeLeft'
// derived from UTC timestamps.
if (nowLiveTitle) {
document.title = `🔴 NOW LIVE – ${nowLiveTitle}`;
} else if (soonestTimeLeft < Infinity) {
const totalSeconds = Math.floor(soonestTimeLeft / 1000);

if (totalSeconds < 3600) {
const mins = Math.floor(totalSeconds / 60);
const secs = totalSeconds % 60;
document.title = `⏳ ${mins}m ${secs}s – ${soonestEventTitle}`;
} else {
const days = Math.floor(totalSeconds / 86400);
const hours = Math.floor((totalSeconds % 86400) / 3600);
document.title = `⏳ ${days}d ${hours}h – ${soonestEventTitle}`;
}
} else {
document.title = 'ggPause';
}

  }, 1000);
}



async function loadReactionsForEvent(wrapper, eventId) {
  const { data } = await supabase.from('reactions').select('emoji, count').eq('event_id', eventId);
  const userEmoji = localStorage.getItem(`reaction_${eventId}`);
  wrapper.querySelectorAll('button').forEach(btn => {
const emoji = btn.getAttribute('data-emoji'); // ✅ important
const found = data.find(r => r.emoji === emoji);
btn.querySelector('span').textContent = found?.count ?? 0;
btn.classList.toggle('reacted', emoji === userEmoji);
});
}
async function loadEvents() {
  const res = await fetch('/events/index.json');
const files = await res.json();
const now = new Date(); // This 'now' is for initial sorting and 'isPast' check based on local time.
// The actual countdown logic is unified by using UTC timestamps.
const parsedEvents = [];

for (const file of files) {
const response = await fetch(`/events/${file}`);
const raw = await response.text();
const { attributes: data } = parseFrontmatter(raw);
data._filename = file;
parsedEvents.push(data);
}

parsedEvents.sort((a, b) => new Date(a.date) - new Date(b.date));


for (const data of parsedEvents) {
// VERY IMPORTANT:
// For the countdown to be unified, the 'data.date' and 'data.end' values
// in your markdown frontmatter (and ultimately in the 'data-start-event-date'
// and 'data-end-event-date' attributes) MUST be in a format that
// `new Date()` interprets as UTC. The best way is ISO 8601 with 'Z' suffix:
// Example: date: "2025-06-07T10:00:00Z" (for 10 AM UTC)
// If they are simply "YYYY-MM-DD HH:MM:SS", new Date() will parse them
// in the user's local timezone, which will break the global consistency.
const date = new Date(data.date);
const isPast = date < now; // This 'isPast' is based on local time for initial placement
const isSteam = data.type === 'steam_sale';


const slug = data.slug || data._filename.replace('.md', '');
const formatTimeShort = d => {
  const dt = new Date(d); // This will display in local time for user convenience
  const h = dt.getHours();
  const m = dt.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'pm' : 'am';
  const hour = ((h + 11) % 12 + 1);
  return `${hour}:${m} <span class="unit">${ampm}</span>`;
};

const formatDateShort = d => {
  const dt = new Date(d); // This will display in local time for user convenience
  const month = dt.toLocaleString('default', { month: 'short' });
  return `${month} ${dt.getDate()}`;
};

const formatSingle = d => `${formatDateShort(d)} - ${formatTimeShort(d)}`;
const formatRange = (start, end) =>
  `${formatDateShort(start)} - ${formatTimeShort(start)} / ${formatDateShort(end)} - ${formatTimeShort(end)}`;
  const formatTimeUTC = d => {
const dt = new Date(d); // This will convert the passed date (hopefully UTC) to its UTC parts
const h = dt.getUTCHours();
const m = dt.getUTCMinutes().toString().padStart(2, '0');
const ampm = h >= 12 ? 'pm' : 'am';
const hour = ((h + 11) % 12 + 1);
return `${hour}:${m} <span class="unit">UTC</span>`;
};


const formatDateUTC = d => {
const dt = new Date(d); // This will convert the passed date (hopefully UTC) to its UTC parts
const month = dt.toLocaleString('default', { month: 'short' }); // still uses locale for month name
return `${month} ${dt.getUTCDate()}`;
};

const formatSingleUTC = d => `${formatDateUTC(d)} - ${formatTimeUTC(d)}`;

const formatRangeUTC = (start, end) =>
`${formatDateUTC(start)} - ${formatTimeUTC(start)} / ${formatDateUTC(end)} - ${formatTimeUTC(end)}`;

  const localDateStr = isSteam
? formatRange(data.date, data.end)
: formatSingle(data.date);

const utcDateStr = isSteam
? formatRangeUTC(data.date, data.end)
: formatSingleUTC(data.date);

  const hasStarted = date <= now;
const isLive = hasStarted && (!data.end || now < new Date(data.end));

const html = `
<div class="event_block ${isLive ? 'now_live event_headliner' : ''}">
<div class="event_logo">
<img src="${data.logo}" alt="logo" />
</div>
<div class="event_card" style="background-image: url('${data.image}')">
<div class="event_card_overlay"></div>
<div class="event_card_content">
  <div class="event_card_main">
    <div class="event_title_wrapper">
<h2 class="event_title event_upc_title">${data.title}</h2>
    </div>
<p class="event_date">
<span class="toggle-date toggle-local active">${localDateStr}</span>
<span class="toggle-date toggle-utc">${utcDateStr}</span>
</p>

    <div class="countdown"
         data-start-event-date="${data.date}"
         ${data.end ? `data-end-event-date="${data.end}"` : ''}>
    </div>
  </div>
  <div class="event_expectations_wrapper">
    <div class="event_reacts">
      <div class="label">Your expectations</div>
      <div class="reaction-bar" data-event="${slug}">
        ${[
{ emoji: '🔥', icon: 'https://cdn.7tv.app/emote/01JDBDSNMQCZ7Z89PRZ712RM5N/4x.gif' },
{ emoji: '😮', icon: 'https://cdn.7tv.app/emote/01G8TM6XNG000836WX1T1D503Y/3x.gif' },
{ emoji: '😱', icon: 'https://cdn.7tv.app/emote/01GT61CD6R000DY5BPCJX9D3EB/3x.gif' },
{ emoji: '😴', icon: 'https://cdn.7tv.app/emote/01FA5S9KGR0003RPW78DX3QB0Z/3x.png' },
{ emoji: '🤡', icon: 'https://cdn.7tv.app/emote/01HMBMJPV0000D32KQCYBK4S1D/4x.png' },
{ emoji: '🥶', icon: 'https://cdn.7tv.app/emote/01FZ6223S8000B4AWRZNMVN918/3x.gif' },
{ emoji: '😂', icon: 'https://cdn.7tv.app/emote/01F9KXJ9AG00005C1KM5Y0PY1D/4x.gif' }
].map(r => `
<button onclick="react(this, '${r.emoji}')" data-emoji="${r.emoji}">
<img src="${r.icon}" class="reaction-icon" alt="${r.emoji}" />
<span>0</span>
</button>
`).join('')}
      </div>
    </div>
    <div class="event_links_block">
      <div class="label">Check it out</div>
      ${renderLinks(data)}
    </div>
  </div>
</div>
</div>
</div>
`;

const target = isPast ? 'past-events' : isSteam ? 'steam-sale-event' : isLive ? 'live-events' : 'upcoming-events';
const container = document.getElementById(target);
if (container) container.insertAdjacentHTML("beforeend", html);

setTimeout(() => {
  const titles = container.querySelectorAll('.event_title');
  titles.forEach(title => {
    const wrapper = title.closest('.event_title_wrapper');
    const overflow = title.scrollWidth - wrapper.clientWidth;
    if (overflow > 10) {
      title.classList.add('scrolling');
      wrapper.classList.add('hover-scroll');
      title.style.setProperty('--scroll-distance', `-${overflow}px`);
    }
  });
}, 100);
}

startCountdowns();


document.querySelectorAll('.reaction-bar').forEach(wrapper => {
const eventId = wrapper.getAttribute('data-event');
loadReactionsForEvent(wrapper, eventId);
});
}

function updateNowPlayingBar() {
  const live = document.querySelector("#live-events .event_headliner");
  const bar = document.getElementById("nowPlayingBar");
  if (!bar) return; // 🛡 prevent crashing

  if (live) {
    const title = live.querySelector(".event_upc_title")?.textContent || "LIVE EVENT";
    const url = live.querySelector(".event_links a")?.getAttribute("href") || "#";
    bar.innerHTML = `🔴 Now Live: ${title} — <a href="${url}" style="color:white;text-decoration:underline;">Watch</a>`;
    bar.style.display = "block";
  } else {
    bar.style.display = "none";
  }
}

function updateLiveStickyBanner() {
const live = document.querySelector("#live-events .event_headliner");
const banner = document.getElementById("liveStickyBanner");

if (live) {
const title = live.querySelector(".event_upc_title")?.textContent || "LIVE EVENT";
const url = live.querySelector(".event_links a")?.getAttribute("href") || "#";
banner.innerHTML = `🔴 <strong>[LIVE]</strong> ${title} — <a href="${url}" style="color:white; text-decoration:underline;">Watch Now</a>`;
banner.style.display = "block";
} else {
banner.style.display = "none";
}
}
document.addEventListener("DOMContentLoaded", async () => {
  await trackPageView();
  await trackVisitor();

  const isTrailers = window.location.pathname.includes('trailers');

  if (!isTrailers) {
    await loadEvents();
    hideEmptySections();
    updateNowPlayingBar();

    document.querySelectorAll('.reaction-bar').forEach(wrapper => {
      const eventId = wrapper.getAttribute('data-event');
      loadReactionsForEvent(wrapper, eventId);
    });

    // It's good to call startCountdowns only once after events are loaded
    // as it sets up its own setInterval.
    startCountdowns();
    // Re-call updateNowPlayingBar to ensure it's up-to-date after countdowns start
    // and live events potentially move.
    setInterval(updateNowPlayingBar, 3000);
  }
});

document.addEventListener('click', function (e) {
const wrapper = e.target.closest('.event_date');
if (!wrapper) return;

const localEl = wrapper.querySelector('.toggle-local');
const utcEl = wrapper.querySelector('.toggle-utc');
if (!localEl || !utcEl) return;

localEl.classList.toggle('active');
utcEl.classList.toggle('active');
});

function hideEmptySections() {
// NOW LIVE section
const live = document.getElementById('live-events');
const liveHeader = document.querySelector('.events_upnext.now_live');
const hasLiveEvent = live?.querySelector('.event_block.now_live');

if (hasLiveEvent) {
live.parentElement.style.display = '';
if (liveHeader) liveHeader.style.display = '';
} else {
live.parentElement.style.display = 'none';
if (liveHeader) liveHeader.style.display = 'none';
}

// STEAM SALE section
const steam = document.getElementById('steam-sale-event');
const steamHeader = document.querySelector('.events_upnext:not(.now_live)');
const hasSteamSale = steam?.querySelector('.event_block');

if (hasSteamSale) {
steam.parentElement.style.display = '';
if (steamHeader) steamHeader.style.display = '';
} else {
steam.parentElement.style.display = 'none';
if (steamHeader) steamHeader.style.display = 'none';
}
}

// Removed duplicate setInterval(updateNowPlayingBar, 3000) here,
// as it's already in the DOMContentLoaded block.
window.addEventListener("load", () => {
const loadingScreen = document.getElementById("loadingScreen");
if (loadingScreen) {
loadingScreen.style.opacity = 0;
setTimeout(() => loadingScreen.remove(), 500);
}
});

function toggleNav() {
const menu = document.querySelector('.nav-menu');
if (menu) {
  menu.classList.toggle('active');
} else {
  console.warn('Menu not found!');
}
}

const konamiCode = [38,38,40,40,37,39,37,39,66,65];
let konamiIndex = 0;

document.addEventListener('keydown', function(e) {
if (e.keyCode === konamiCode[konamiIndex]) {
konamiIndex++;
if (konamiIndex === konamiCode.length) {
  activateKonamiEffect();
  konamiIndex = 0;
}
} else {
konamiIndex = 0;
}
});

function activateKonamiEffect() {
playKonamiSound();
runContraAcrossScreen();
switchFontToContra();
}

function playKonamiSound() {
const audio = new Audio('/sounds/konami.mp3');
audio.volume = 0.5;
audio.play();
}

function switchFontToContra() {
document.body.classList.add('contra-mode');

setTimeout(() => {
document.body.classList.remove('contra-mode');
}, 10000);
}

function runContraAcrossScreen() {
const runner = document.getElementById('contraRunner');
if (!runner) return;

runner.style.display = 'block';
runner.style.opacity = 1;
runner.style.position = 'fixed';
runner.style.left = '-150px';
runner.style.bottom = '20px';
runner.style.height = '200px';
runner.style.zIndex = '9999';
runner.style.pointerEvents = 'none';

runner.animate([
{ left: '-150px', opacity: 1 },
{ left: '110vw', opacity: 1 }
], {
duration: 4000,
easing: 'ease-in-out'
});

setTimeout(() => {
runner.style.opacity = 0;
}, 4000);
}