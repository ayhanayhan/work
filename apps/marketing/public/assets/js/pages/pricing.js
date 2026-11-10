document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('tc-feature-search');
  const table = document.querySelector('.tc-comparison table');
  if (!input || !table || !table.tBodies.length) return;
  const toggle = document.getElementById('tc-only-differences');
  const status = document.getElementById('tc-search-status');
  const empty = document.getElementById('tc-no-results');
  const rows = [...table.tBodies[0].rows];
  const norm = text => (text || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('tr-TR');

  function featureValues(row) {
    // Compare actual package cell contents, not feature labels/descriptions.
    return [...row.cells].slice(1).map(cell => norm(cell.textContent));
  }
  function refresh() {
    const query = norm(input.value);
    const differencesOnly = !!toggle?.checked;
    let matches = 0;
    let group = null;
    let groupRows = [];
    function endGroup() {
      if (group) group.hidden = !groupRows.some(row => !row.hidden);
    }
    for (const row of rows) {
      if (row.classList.contains('tc-table-group')) {
        endGroup(); group = row; groupRows = []; group.hidden = false; continue;
      }
      const values = featureValues(row);
      const differs = new Set(values).size > 1;
      const isMatch = !query || norm(row.cells[0]?.textContent).includes(query);
      row.hidden = !isMatch || (differencesOnly && !differs);
      groupRows.push(row);
      if (!row.hidden) matches++;
    }
    endGroup();
    if (status) status.textContent = (query || differencesOnly) ? `${matches} özellik gösteriliyor` : '';
    if (empty) empty.hidden = matches > 0;
  }
  input.addEventListener('input', refresh);
  toggle?.addEventListener('change', refresh);
  document.querySelectorAll('.tc-feature-info').forEach(btn => {
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      const extra = btn.closest('.tc-feature-meta')?.querySelector('.tc-feature-extra');
      if (extra) extra.hidden = expanded;
    });
  });

  const root = document.querySelector('.tc-comparison');
  const header = document.querySelector('.tc-site-header');
  const thead = table.tHead;
  function syncStickyOffsets() {
    if (!root || !thead) return;
    // Use fixed header height, not its animated scroll position, to avoid sticky jitter.
    const headerBottom = header ? Math.ceil(header.getBoundingClientRect().height) : 0;
    const headHeight = Math.ceil(thead.getBoundingClientRect().height);
    root.style.setProperty('--tc-fixed-header-height', `${Math.ceil(headerBottom)}px`);
    root.style.setProperty('--tc-group-offset', `${Math.ceil(headerBottom + headHeight - 1)}px`);
  }
  // Preserve the exact original thead design while keeping it visible below
  // the site navigation. A normal position:sticky stops working inside the
  // horizontally scrollable table region on narrower viewports.
  const region = table.closest('.tc-table-scroll');
  const cloneHost = document.createElement('div');
  cloneHost.className = 'tc-pricing-floating-head tc-comparison';
  cloneHost.setAttribute('aria-hidden', 'false');
  cloneHost.hidden = true;
  const cloneTable = document.createElement('table');
  cloneTable.className = 'tc-pricing-floating-table';
  const headClone = thead?.cloneNode(true);
  if (headClone) cloneTable.appendChild(headClone);
  cloneHost.appendChild(cloneTable);
  document.body.appendChild(cloneHost);
  const sourceHeadCells = [...(thead?.rows?.[0]?.cells || [])];
  const cloneHeadCells = [...(headClone?.querySelectorAll('th') || [])];
  for (const element of cloneHost.querySelectorAll('[id]')) {
    element.id = 'floating-' + element.id;
  }
  const cloneInput = cloneHost.querySelector('input[type="search"]');
  const cloneToggle = cloneHost.querySelector('input[type="checkbox"]');
  const cloneStatus = cloneHost.querySelector('.tc-search-status');
  if (cloneInput) {
    cloneInput.value = input.value;
    cloneInput.addEventListener('input', () => {
      input.value = cloneInput.value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
  if (cloneToggle && toggle) {
    cloneToggle.checked = toggle.checked;
    cloneToggle.addEventListener('change', () => {
      toggle.checked = cloneToggle.checked;
      toggle.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }
  function syncFloatingContent() {
    if (cloneInput && cloneInput !== document.activeElement) cloneInput.value = input.value;
    if (cloneToggle && toggle) cloneToggle.checked = toggle.checked;
    if (cloneStatus && status) cloneStatus.textContent = status.textContent;
  }
  input.addEventListener('input', syncFloatingContent);
  toggle?.addEventListener('change', syncFloatingContent);
  function navBottom() {
    if (!header) return 0;
    // The header itself can contain an announcement bar which scrolls away.
    // Use visible navigation bounds, not the total document-header height.
    const visible = [...header.querySelectorAll('.tc-navigation-bar, .tc-navigation, .tc-header-main, .tc-header-inner, .tc-navigation-wrapper')]
      .map(x => x.getBoundingClientRect())
      .filter(rect => rect.height > 0 && rect.top <= 1 && rect.bottom > 0);
    if (visible.length) return Math.ceil(Math.max(...visible.map(rect => rect.bottom)));
    const rect = header.getBoundingClientRect();
    return rect.top <= 1 && rect.bottom > 0 ? Math.ceil(rect.bottom) : 0;
  }
  function syncFloatingHeader() {
    if (!region || !thead || !sourceHeadCells.length) return;
    const rect = region.getBoundingClientRect();
    const tableRect = table.getBoundingClientRect();
    const sourceRect = thead.getBoundingClientRect();
    const offset = navBottom();
    const height = Math.ceil(sourceRect.height);
    const shouldShow = rect.width > 0 && height > 0
      && sourceRect.top < offset && tableRect.bottom > offset + height;
    cloneHost.hidden = !shouldShow;
    if (!shouldShow) return;
    cloneHost.style.top = offset + 'px';
    cloneHost.style.left = rect.left + 'px';
    cloneHost.style.width = rect.width + 'px';
    cloneHost.style.height = height + 'px';
    cloneTable.style.width = tableRect.width + 'px';
    cloneTable.style.transform = 'translateX(' + (-region.scrollLeft) + 'px)';
    sourceHeadCells.forEach((cell, index) => {
      const target = cloneHeadCells[index];
      if (!target) return;
      const width = cell.getBoundingClientRect().width + 'px';
      target.style.width = width;
      target.style.minWidth = width;
      target.style.maxWidth = width;
    });
    syncFloatingContent();
  }
  let framePending = false;
  function queueStickySync() {
    if (framePending) return;
    framePending = true;
    requestAnimationFrame(() => {
      framePending = false;
      syncStickyOffsets();
      syncFloatingHeader();
    });
  }
  window.addEventListener('scroll', queueStickySync, { passive: true });
  region?.addEventListener('scroll', queueStickySync, { passive: true });
  queueStickySync();
  window.addEventListener('resize', queueStickySync, { passive: true });
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(queueStickySync);
    observer.observe(thead);
    if (header) observer.observe(header);
  }
  refresh();
});
