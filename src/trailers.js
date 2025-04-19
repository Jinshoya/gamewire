import { supabase } from './supabaseClient.js';

let trailerData = [];
let filteredData = [];
let currentPage = 1;
let currentFilter = "game"; // Default to "game"
let searchQuery = "";

const ITEMS_PER_PAGE = 20;

const container = document.getElementById("trailerList");
const pagination = document.getElementById("pagination");
const modal = document.getElementById("trailerModal");
const modalFrame = document.getElementById("modalFrame");
const modalTitle = document.getElementById("modalTitle");

function filterData() {
  filteredData = trailerData.filter(item =>
    (currentFilter === "all" || item.type === currentFilter) &&
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  currentPage = 1;
  render();
}

function render() {
  container.innerHTML = "";

  if (filteredData.length === 0) {
    container.innerHTML = `
      <div class="trailer-card no-results-card">
        <div class="title-wrapper">
          <span class="trailer-title">😕 No trailers found.</span>
        </div>
      </div>
    `;
    pagination.innerHTML = "";
    return;
  }

  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = filteredData.slice(start, start + ITEMS_PER_PAGE);

  pageItems.forEach(item => {
    const card = document.createElement("div");
    card.className = "trailer-card";
    card.innerHTML = `
      <img src="${item.thumbnail}" class="thumb" />
      <div class="title-wrapper">
        <span class="trailer-title">${item.title}</span>
      </div>
      <button class="watch-btn" data-id="${item.youtube_id}" data-title="${item.title}" tabindex="-1">▶</button>
    `;
    container.appendChild(card);

    card.addEventListener("click", () => {
      modal.style.display = "flex";
      modalTitle.textContent = item.title;
      modalFrame.src = `https://www.youtube.com/embed/${item.youtube_id}`;
    });
  });

  pagination.innerHTML = `
    <button onclick="prevPage()">◀ Prev</button>
    Page ${currentPage} of ${Math.ceil(filteredData.length / ITEMS_PER_PAGE)}
    <button onclick="nextPage()">Next ▶</button>
  `;

  setupTitleScrollReveal();
}

function setupTitleScrollReveal() {
  document.querySelectorAll(".title-wrapper").forEach(wrapper => {
    const title = wrapper.querySelector(".trailer-title");

    wrapper.addEventListener("mouseenter", () => {
      const scrollAmount = title.scrollWidth - wrapper.clientWidth;
      if (scrollAmount > 0) {
        title.style.transition = "transform 1.5s ease-in-out";
        title.style.transform = `translateX(-${scrollAmount}px)`;

        setTimeout(() => {
          title.style.transform = `translateX(0)`;
        }, 2500);
      }
    });

    wrapper.addEventListener("mouseleave", () => {
      title.style.transition = "transform 0.5s ease-out";
      title.style.transform = `translateX(0)`;
    });
  });
}

function nextPage() {
  if ((currentPage * ITEMS_PER_PAGE) < filteredData.length) {
    currentPage++;
    render();
  }
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    render();
  }
}

function setFilter(filter) {
  currentFilter = filter;
  filterData();
}

document.getElementById("searchInput").addEventListener("input", (e) => {
  searchQuery = e.target.value;
  filterData();
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

async function loadTrailers() {
  try {
    const { data, error } = await supabase
      .from('trailers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;
    trailerData = data || [];
    filterData();
  } catch (err) {
    console.error("❌ Failed to load trailer data from Supabase", err);
  }
}

async function loadLastUpdatedTime() {
  const footerTime = document.getElementById("lastUpdatedTime");
  if (footerTime) {
    try {
      const { data, error } = await supabase
        .from('trailers')
        .select('fetched_at')
        .order('fetched_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      const lastTime = data?.[0]?.fetched_at;
      if (lastTime) {
        const date = new Date(lastTime);
        footerTime.textContent = `🕒 Last updated: ${date.toLocaleString()}`;
      } else {
        footerTime.textContent = `🕒 Last updated: unknown`;
      }
    } catch (err) {
      console.error("❌ Failed to load last updated time:", err);
    }
  }
}
async function updateLastUpdatedTime() {
  const footerTime = document.getElementById("lastUpdatedTime");
  if (!footerTime) return;

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

updateLastUpdatedTime();


// 🚀 Initialize
loadTrailers();
loadLastUpdatedTime();
window.setFilter = setFilter;
window.nextPage = nextPage;
window.prevPage = prevPage;
