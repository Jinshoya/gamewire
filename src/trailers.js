import { supabase } from './supabaseClient.js';

let trailerData = [];
let filteredData = [];
let currentFilter = "all";
let searchQuery = "";
let visibleCount = 20;
let infiniteScrollEnabled = false;

const ITEMS_PER_SCROLL = 20;

const container = document.getElementById("trailerList");
const floatingDate = document.getElementById("floatingDate");
const modal = document.getElementById("trailerModal");
const modalFrame = document.getElementById("modalFrame");
const modalTitle = document.getElementById("modalTitle");

function setFilter(filter) {
  currentFilter = filter;
  localStorage.setItem("trailerFilter", filter); // ✅ Save it

  document.querySelectorAll(".filter-buttons button").forEach(btn =>
    btn.classList.remove("active")
  );
  const btn = document.querySelector(`.filter-buttons button[onclick="setFilter('${filter}')"]`);
  if (btn) btn.classList.add("active");

  visibleCount = ITEMS_PER_SCROLL;
  infiniteScrollEnabled = false;
  container.innerHTML = "";
  filterAndRender();
}


document.getElementById("searchInput").addEventListener("input", (e) => {
  searchQuery = e.target.value;
  visibleCount = ITEMS_PER_SCROLL;
  infiniteScrollEnabled = false;
  container.innerHTML = "";
  filterAndRender();
});

document.getElementById("closeModal").addEventListener("click", () => {
  modal.style.display = "none";
  modalFrame.src = "";
});

modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.style.display = "none";
    modalFrame.src = "";
  }
});

function markWatched(id) {
  const watched = new Set(JSON.parse(localStorage.getItem("watchedTrailers") || "[]"));
  watched.add(id);
  localStorage.setItem("watchedTrailers", JSON.stringify([...watched]));
}

function isWatched(id) {
  const watched = new Set(JSON.parse(localStorage.getItem("watchedTrailers") || "[]"));
  return watched.has(id);
}

function filterAndRender() {
  filteredData = trailerData.filter(item =>
    (currentFilter === "all" || item.type === currentFilter) &&
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  container.innerHTML = ""; // Clear container before rendering

  if (filteredData.length === 0) {
    container.innerHTML = `<div class="no-results">😕 No trailers found</div>`;
    updateLoadMoreButton(); // Hide the button if needed
    floatingDate.style.display = "none";
    return;
  }

  renderNextBatch();
  updateLoadMoreButton();
  trackFloatingHeader();
}


function groupByDate(data) {
  const grouped = {};
  data.forEach(item => {
    const date = new Date(item.created_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(item);
  });
  return grouped;
}

function renderNextBatch() {
  const sliced = filteredData.slice(0, visibleCount);
  const grouped = groupByDate(sliced);

  for (const [date, items] of Object.entries(grouped)) {
    let group = container.querySelector(`[data-date="${date}"]`);

    if (!group) {
      group = document.createElement("div");
      group.className = "timeline-group";
      group.setAttribute("data-date", date);

      const header = document.createElement("div");
      header.className = "timeline-date";
      header.textContent = date;
      group.appendChild(header);

      container.appendChild(group);
    }
    let watched = JSON.parse(localStorage.getItem("watchedTrailers") || "[]");

    function isWatched(id) {
      return watched.includes(id);
    }
    
    function markWatched(id) {
      if (!watched.includes(id)) {
        watched.push(id);
        localStorage.setItem("watchedTrailers", JSON.stringify(watched));
      }
    }
    items.forEach(item => {
      if (group.querySelector(`[data-id="${item.youtube_id}"]`)) return;
    
      const card = document.createElement("div");
      card.className = "trailer-card";
      card.setAttribute("data-id", item.youtube_id);
    
      const watchedNow = isWatched(item.youtube_id);
    
      if (item.isNew) card.classList.add("new");
      if (watchedNow) card.classList.add("watched");
    
      const iconSVG = watchedNow
        ? `<svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/></svg>`
        : `<svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>`;
    
      card.innerHTML = `
        <img src="${item.thumbnail}" class="thumb" />
        <div class="title-wrapper">
          <span class="trailer-title">${item.title}</span>
        </div>
        <button class="watch-btn" data-id="${item.youtube_id}" data-title="${item.title}" tabindex="-1" aria-label="Watch Trailer">
          ${iconSVG}
        </button>
      `;
    
      card.addEventListener("click", () => {
        markWatched(item.youtube_id);
        card.classList.add("watched");
      
        modal.style.display = "flex";
        modalTitle.textContent = item.title;
        modalFrame.src = `https://www.youtube.com/embed/${item.youtube_id}`;
      
        // ✅ Clean movie title for better search accuracy
        const cleanTitle = item.title
        .replace(/\(\s*\d*\s?(season|сезон)\s*\)/gi, "") // ✅ Removes "(3 сезон)", "(Season 2)"
        .replace(/\b(season|сезон|\d+\s?сезон|Season\s?\d+)\b/gi, "") // Removes season-related words
        .replace(/(trailer|teaser trailer|русский трейлер|трейлер|—).*$/gi, "") // Removes trailer-related words
        .replace(/\(\s*\)/g, "") // Removes any leftover empty brackets
        .trim();
      
      
      
        let modalLinks = "";
      
        // ✅ Movies (English) → IMDb + Kinopoisk
        if (item.type === "movie") {
          const imdbSearchUrl = `https://www.imdb.com/find?q=${encodeURIComponent(cleanTitle)}`;
          const kinopoiskSearchUrl = `https://www.kinopoisk.ru/index.php?kp_query=${encodeURIComponent(cleanTitle)}`;
      
          modalLinks = `
            <button class="modal-btn" onclick="window.open('${imdbSearchUrl}', '_blank')">
              <img src="/images/links/IMDB.png" alt="IMDb" class="logo-btn">
            </button>
            <button class="modal-btn" onclick="window.open('${kinopoiskSearchUrl}', '_blank')">
              <img src="/images/links/kinopoisk.png" alt="Kinopoisk" class="logo-btn">
            </button>
          `;
        } 
      
        // ✅ Russian movies → Only Kinopoisk
        else if (item.type === "russian") {
          const kinopoiskSearchUrl = `https://www.kinopoisk.ru/index.php?kp_query=${encodeURIComponent(cleanTitle)}`;
      
          modalLinks = `
            <button class="modal-btn" onclick="window.open('${kinopoiskSearchUrl}', '_blank')">
              <img src="/images/links/kinopoisk.png" alt="Kinopoisk" class="logo-btn">
            </button>
          `;
        }
      
        // ✅ No buttons for games
        modal.innerHTML = `
          <div class="modal-content">
            <h2 id="modalTitle">${item.title}</h2>
            <iframe id="modalFrame" src="https://www.youtube.com/embed/${item.youtube_id}" frameborder="0" allowfullscreen></iframe>
            <div class="modal-buttons">
              ${modalLinks} <!-- ✅ Only relevant buttons appear -->
            </div>
          </div>
        `;
      });
      
      
      
      
      
    
      group.appendChild(card);
      requestAnimationFrame(() => card.classList.add("show"));
    });
    trackFloatingHeader();
  }
}

function updateLoadMoreButton() {
  let btn = document.getElementById("loadMoreBtn");

  if (visibleCount >= filteredData.length) {
    btn?.remove();
    return;
  }

  if (!btn) {
    btn = document.createElement("button");
    btn.id = "loadMoreBtn";
    btn.className = "load-more-btn";
    btn.textContent = "⬇ Load More";
    btn.addEventListener("click", () => {
      visibleCount += ITEMS_PER_SCROLL;
      renderNextBatch();
      updateLoadMoreButton();
    });
    container.parentElement.appendChild(btn); // <-- attach to container's parent, not inside trailer groups
  } else {
    container.parentElement.appendChild(btn); // <-- move to bottom
  }
}


function enableInfiniteScroll() {
  if (infiniteScrollEnabled) return;
  infiniteScrollEnabled = true;

  window.addEventListener("scroll", () => {
    if (
      window.innerHeight + window.scrollY >= document.body.offsetHeight - 300 &&
      visibleCount < filteredData.length
    ) {
      visibleCount += ITEMS_PER_SCROLL;
      renderNextBatch();
      updateLoadMoreButton();
      
    }
  });
}

function trackFloatingHeader() {
  const headers = [...document.querySelectorAll(".timeline-date")];

  function updateFloatingDate() {
    let lastVisible = null;

    for (const header of headers) {
      const rect = header.getBoundingClientRect();
      if (rect.top < 80) {
        lastVisible = header;
      }
    }

    if (lastVisible) {
      floatingDate.textContent = `🕒 ${lastVisible.textContent}`;
      floatingDate.style.display = "block";
    } else {
      floatingDate.style.display = "none";
    }
  }

  // Remove previous listener and add a new one
  window.removeEventListener("scroll", updateFloatingDate);
  window.addEventListener("scroll", updateFloatingDate);

  // Call it once immediately
  updateFloatingDate();
}



async function loadTrailers() {
  try {
    const { data, error } = await supabase
      .from("trailers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) throw error;

    trailerData = (data || []).map(item => {
      const created = new Date(item.created_at);
      const now = new Date();
      const diff = (now - created) / (1000 * 60 * 60);
      item.isNew = diff < 48;
      return item;
    });

    filterAndRender();
    trackFloatingHeader();
  } catch (err) {
    console.error("❌ Failed to load trailers", err);
  }
}

async function loadLastUpdatedTime() {
  const footerTime = document.getElementById("lastUpdatedTime");
  const { data, error } = await supabase
    .from("meta")
    .select("value")
    .eq("key", "last_trailer_sync")
    .single();

  if (error || !data?.value) {
    console.error("❌ Failed to load last updated time:", error);
    footerTime.textContent = "⚠️ Error checking updates";
    return;
  }

  const date = new Date(data.value);
  const formatted = date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  footerTime.textContent = `🕒 Last updated: ${formatted}`;
}

// 🚀 LET IT RIP
loadTrailers();
loadLastUpdatedTime();
window.setFilter = setFilter;
// 🚀 LET IT RIP
loadTrailers();
loadLastUpdatedTime();

// ✅ Restore saved filter (or default to "game")
const savedFilter = localStorage.getItem("trailerFilter") || "game";
window.setFilter = setFilter;
setFilter(savedFilter);
