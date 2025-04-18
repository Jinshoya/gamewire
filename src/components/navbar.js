export function injectNavbar() {
    const currentPath = window.location.pathname;
  
    const html = `
      <nav class="gg-navbar">
        <div class="nav-logo">
          <a href="/"><img src="/images/logo.png" alt="ggPause Logo" /></a>
        </div>
        <ul class="nav-menu">
          <li><a href="/" class="${currentPath === '/' ? 'selected' : ''}">Home</a></li>
          <li><a href="/trailers.html" class="${currentPath === '/trailers.html' ? 'selected' : ''}">Trailers</a></li>
        </ul>
      </nav>
    `;
  
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    document.body.insertBefore(wrapper, document.body.firstChild);
  }
  