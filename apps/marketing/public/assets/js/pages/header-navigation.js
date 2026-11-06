/* Ticarti navigation: desktop mega menus + accessible left-side mobile drawer. */
(() => {
  const header = document.querySelector('.tc-site-header');
  if (!header) return;

  const burger = header.querySelector('.tc-menu-toggle');
  const drawer = header.querySelector('.tc-navigation-panel');
  const mega = header.querySelector('.tc-mega-navigation');
  const submenuSlot = header.querySelector('.tc-ui-submenu-slot');
  const back = header.querySelector('.tc-ui-back');
  const triggers = [...header.querySelectorAll('.primary-menu a.has-mega[data-mega-slug]')];
  const panels = mega ? [...mega.querySelectorAll(':scope > ul[data-mega]')] : [];
  const media = window.matchMedia('(max-width: 991px)');
  let active = null;
  let lastFocused = null;

  if (!burger || !drawer) return;

  drawer.id = drawer.id || 'ticarti-mobile-navigation';
  burger.setAttribute('aria-controls', drawer.id);
  burger.setAttribute('aria-label', 'Menüyü aç');

  // The panel remains the original menu: there are no duplicate navigation links.
  const drawerHeader = document.createElement('div');
  drawerHeader.className = 'tc-ui-drawer-header';
  drawerHeader.innerHTML = `
    <a class="tc-ui-drawer-brand" href="${header.querySelector('.logo a')?.getAttribute('href') || 'index.html'}" aria-label="Ticarti ana sayfa">
      <img src="${header.querySelector('.logo img')?.getAttribute('src') || ''}" alt="Ticarti">
    </a>
    <button type="button" class="tc-ui-drawer-close" aria-label="Menüyü kapat">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
    </button>`;
  drawer.insertBefore(drawerHeader, drawer.firstChild);
  const closeButton = drawerHeader.querySelector('.tc-ui-drawer-close');
  const overlay = document.createElement('div');
  overlay.className = 'tc-ui-drawer-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  // Place the backdrop above the header as well, while keeping the drawer above it.
  header.appendChild(overlay);

  const isMobile = () => media.matches;
  const drawerIsOpen = () => header.classList.contains('is-mobile-open');

  function closeSubmenu() {
    triggers.forEach(a => {
      a.classList.remove('is-open');
      a.setAttribute('aria-expanded', 'false');
    });
    panels.forEach(p => {
      p.classList.remove('is-open');
      if (p.parentElement !== mega) mega.appendChild(p);
    });
    header.classList.remove('is-submenu');
    active = null;
  }

  function openSubmenu(trigger) {
    const panel = panels.find(p => p.dataset.mega === trigger.dataset.megaSlug);
    if (!panel) return;
    closeSubmenu();
    active = trigger;
    trigger.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
    panel.classList.add('is-open');
    if (isMobile()) {
      submenuSlot?.appendChild(panel);
      header.classList.add('is-submenu');
      const label = header.querySelector('.tc-ui-back-label');
      if (label) label.textContent = trigger.textContent.trim();
      drawer.scrollTop = 0;
      back?.focus({ preventScroll: true });
    }
  }

  function openDrawer() {
    if (!isMobile() || drawerIsOpen()) return;
    lastFocused = document.activeElement;
    header.classList.remove('is-hidden');
    header.classList.add('is-mobile-open');
    document.documentElement.classList.add('tc-drawer-lock');
    document.body.classList.add('tc-drawer-lock');
    overlay.classList.add('is-visible');
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-label', 'Ticarti mobil menüsü');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Menüyü kapat');
    closeButton.focus({ preventScroll: true });
  }

  function closeDrawer(restoreFocus = true) {
    const wasOpen = drawerIsOpen();
    closeSubmenu();
    header.classList.remove('is-mobile-open');
    document.documentElement.classList.remove('tc-drawer-lock');
    document.body.classList.remove('tc-drawer-lock');
    overlay.classList.remove('is-visible');
    drawer.removeAttribute('role');
    drawer.removeAttribute('aria-modal');
    drawer.removeAttribute('aria-label');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Menüyü aç');
    if (wasOpen && restoreFocus) (lastFocused?.isConnected ? lastFocused : burger).focus({ preventScroll: true });
    lastFocused = null;
  }

  burger.addEventListener('click', () => drawerIsOpen() ? closeDrawer() : openDrawer());
  closeButton.addEventListener('click', () => closeDrawer());
  overlay.addEventListener('click', () => closeDrawer());
  back?.setAttribute('aria-label', 'Ana menüye geri dön');
  back?.addEventListener('click', () => {
    const previousTrigger = active;
    closeSubmenu();
    previousTrigger?.focus({ preventScroll: true });
    drawer.scrollTop = 0;
  });

  triggers.forEach(trigger => {
    trigger.addEventListener('click', event => {
      event.preventDefault();
      active === trigger ? closeSubmenu() : openSubmenu(trigger);
    });
    trigger.parentElement?.addEventListener('mouseenter', () => {
      if (!isMobile()) openSubmenu(trigger);
    });
  });
  mega?.addEventListener('mouseleave', () => {
    if (!isMobile()) closeSubmenu();
  });

  // Ordinary links navigate normally, but close the drawer first (including #anchors).
  drawer.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || link.classList.contains('has-mega')) return;
    if (drawerIsOpen()) closeDrawer(false);
  });

  document.addEventListener('click', event => {
    if (!header.contains(event.target) && !drawerIsOpen()) closeSubmenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (drawerIsOpen()) {
        event.preventDefault();
        if (header.classList.contains('is-submenu')) {
          const previousTrigger = active;
          closeSubmenu();
          previousTrigger?.focus({ preventScroll: true });
        } else closeDrawer();
      } else closeSubmenu();
    }
    if (event.key !== 'Tab' || !drawerIsOpen()) return;
    const focusables = [...drawer.querySelectorAll('a[href],button:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])')]
      .filter(el => el.getClientRects().length > 0);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && (document.activeElement === first || !drawer.contains(document.activeElement))) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !drawer.contains(document.activeElement))) {
      event.preventDefault(); first.focus();
    }
  });
  const onViewportChange = () => {
    if (!isMobile()) closeDrawer(false);
    else closeSubmenu();
  };
  if (media.addEventListener) media.addEventListener('change', onViewportChange);
  else media.addListener(onViewportChange);

  header.querySelector('.lang-select')?.addEventListener('change', event => {
    const option = event.target.selectedOptions[0];
    if (option?.dataset.url && !option.disabled) location.href = option.dataset.url;
  });
})();
