function loadUser() {
  const raw = localStorage.getItem('authUser');
  return raw ? JSON.parse(raw) : null;
}

function clearUser() {
  localStorage.removeItem('authUser');
}

function initDashboard(expectedRole, contentHtml) {
  const user = loadUser();
  if (!user) {
    window.location.href = '/';
    return;
  }
  if (expectedRole && user.role !== expectedRole) {
    window.location.href = `/dashboards/${user.role}.html`;
    return;
  }
  const who = document.getElementById('whoami');
  const content = document.getElementById('content');
  const logoutBtn = document.getElementById('logout');
  const title = document.getElementById('title');
  if (title && expectedRole) {
    if (expectedRole === 'patient' || expectedRole === 'doctor' || expectedRole === 'nurse') {
      const initial = String(user.username || '?').slice(0,1).toUpperCase();
      const imgUrl = localStorage.getItem('profilePicUrl') || '';
      if (imgUrl) {
        title.innerHTML = `<span class="title-wrap"><img src="${imgUrl}" alt="" class="avatar-img" /><span class="who-name">${user.username || ''}</span></span>`;
      } else {
        title.innerHTML = `<span class="title-wrap"><span class="avatar">${initial}</span><span class="who-name">${user.username || ''}</span></span>`;
      }
    } else {
      const nice = expectedRole.charAt(0).toUpperCase() + expectedRole.slice(1);
      title.textContent = `${nice} Dashboard`;
    }
  }
  if (who && who.parentNode) {
    try { who.parentNode.removeChild(who); } catch (_) { who.style.display = 'none'; }
  }
  if (content && typeof contentHtml === 'string') {
    content.innerHTML = contentHtml;
  }
  // Add class to hide scrollbar for admin dashboard
  const userRole = expectedRole || (user && user.role);
  if (userRole === 'admin') {
    if (content) {
      content.classList.add('admin-dashboard');
      // Apply inline styles as backup
      content.style.scrollbarWidth = 'none';
      content.style.msOverflowStyle = 'none';
    }
    document.body.classList.add('admin');
    // Also hide scrollbar on body and html
    document.body.style.scrollbarWidth = 'none';
    document.body.style.msOverflowStyle = 'none';
    document.documentElement.style.scrollbarWidth = 'none';
    document.documentElement.style.msOverflowStyle = 'none';
    
    // Inject style tag as final fallback to ensure scrollbar is hidden
    const styleId = 'admin-hide-scrollbar';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        body.admin #content.card,
        #content.card.admin-dashboard {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        body.admin #content.card::-webkit-scrollbar,
        #content.card.admin-dashboard::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        body.admin,
        html:has(body.admin) {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        body.admin::-webkit-scrollbar,
        html:has(body.admin)::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
      `;
      document.head.appendChild(style);
    }
  }
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      clearUser();
      window.location.href = '/';
    });
  }
}


function initTabs(container) {
  const root = typeof container === 'string' ? document.querySelector(container) : container;
  if (!root) return;
  const navButtons = root.querySelectorAll('.tab-link');
  const panes = root.querySelectorAll('.tab-pane');
  function activate(id) {
    panes.forEach(p => p.classList.toggle('active', p.id === id));
    navButtons.forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === id));
  }
  const initial = Array.from(navButtons).find(b => b.classList.contains('active'))?.getAttribute('data-tab') || Array.from(navButtons)[0]?.getAttribute('data-tab');
  if (initial) activate(initial);
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => activate(btn.getAttribute('data-tab')));
  });
}

// Hide scrollbars for admin dashboard - ULTRA AGGRESSIVE VERSION
// This runs immediately and continuously checks
(function hideAdminScrollbars() {
  function checkAndHide() {
    try {
      // Check localStorage directly for admin role
      const authUser = localStorage.getItem('authUser');
      let isAdmin = false;
      
      if (authUser) {
        try {
          const user = JSON.parse(authUser);
          isAdmin = user && user.role === 'admin';
        } catch (e) {
          // Ignore parse errors
        }
      }
      
      // Also check URL and DOM
      isAdmin = isAdmin || 
                window.location.pathname.includes('admin') ||
                window.location.href.includes('admin') ||
                document.body.classList.contains('admin') ||
                document.getElementById('admin-tabs') ||
                document.querySelector('[id*="admin"]') ||
                document.querySelector('[class*="admin"]');
      
      if (isAdmin) {
        // Mark body and html
        document.body.classList.add('admin');
        document.documentElement.classList.add('admin-page');
        document.body.setAttribute('data-role', 'admin');
        document.documentElement.setAttribute('data-role', 'admin');
        
        const content = document.getElementById('content');
        if (content) {
          content.classList.add('admin-dashboard');
        }
        
        // Create or update style tag
        const styleId = 'admin-hide-scrollbar-force';
        let style = document.getElementById(styleId);
        if (!style) {
          style = document.createElement('style');
          style.id = styleId;
          document.head.appendChild(style);
        }
        
        // Ultra-aggressive CSS that targets EVERYTHING - including * selector
        style.textContent = `
          /* Hide ALL scrollbars when admin - NUCLEAR OPTION */
          html.admin-page *,
          html:has(body.admin) *,
          body.admin *,
          [data-role="admin"] *,
          * {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
            overflow: -moz-scrollbars-none !important;
          }
          html.admin-page *::-webkit-scrollbar,
          html:has(body.admin) *::-webkit-scrollbar,
          body.admin *::-webkit-scrollbar,
          [data-role="admin"] *::-webkit-scrollbar,
          *::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
            background: transparent !important;
            visibility: hidden !important;
            opacity: 0 !important;
          }
          /* Also target html and body specifically */
          html.admin-page,
          html:has(body.admin),
          body.admin {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
            overflow: -moz-scrollbars-none !important;
          }
          html.admin-page::-webkit-scrollbar,
          html:has(body.admin)::-webkit-scrollbar,
          body.admin::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
          }
        `;
        
        // Apply inline styles to html, body, and all major containers
        const elementsToStyle = [
          document.documentElement,
          document.body,
          document.getElementById('content'),
          document.querySelector('main'),
          document.querySelector('.container')
        ].filter(Boolean);
        
        elementsToStyle.forEach(el => {
          el.style.scrollbarWidth = 'none';
          el.style.msOverflowStyle = 'none';
          if (el.style.setProperty) {
            el.style.setProperty('scrollbar-width', 'none', 'important');
            el.style.setProperty('-ms-overflow-style', 'none', 'important');
          }
        });
      }
    } catch (e) {
      console.error('Error hiding admin scrollbars:', e);
    }
  }
  
  // Run immediately
  checkAndHide();
  
  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAndHide);
  } else {
    checkAndHide();
  }
  
  // Run multiple times with increasing delays
  [10, 50, 100, 200, 300, 500, 750, 1000, 2000].forEach(delay => {
    setTimeout(checkAndHide, delay);
  });
  
  // Also run on any DOM mutations (for dynamically loaded content)
  if (window.MutationObserver) {
    const observer = new MutationObserver(checkAndHide);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'id']
    });
  }
})();


