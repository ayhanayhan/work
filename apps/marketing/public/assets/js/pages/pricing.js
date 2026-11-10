function initTicartiPricingComparison() {
  // LegacyScripts injects this script after React hydration; DOMContentLoaded
  // has often fired already, so initialize immediately in that case.
  if (document.documentElement.dataset.tcPricingComparisonReady === '1') return;
  const input = document.getElementById('tc-feature-search');
  const table = document.querySelector('.tc-comparison table');
  if (!input || !table || !table.tBodies.length) return;
  document.documentElement.dataset.tcPricingComparisonReady = '1';
  const toggle = document.getElementById('tc-only-differences');
  const status = document.getElementById('tc-search-status');
  const empty = document.getElementById('tc-no-results');
  const rows = [...table.tBodies[0].rows];
  const norm = text => (text || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('tr-TR');

  function featureValues(row) {
    // Compare package inclusions and limits, not feature names or descriptions.
    // The source design may represent "included" as a check or as a word.
    return [...row.cells].slice(1).map(cell => {
      const value = norm(cell.textContent);
      if (cell.querySelector('.tc-dash') || ['—', '–', '-', 'yok'].includes(value)) return 'not-included';
      if (cell.querySelector('.tc-check') || ['✓', '✔', 'dahil', 'included'].includes(value)) return 'included';
      return value;
    });
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
      // Compare actual per-package values. Exclude the feature label and
      // descriptions; normalize case/spacing to avoid false differences.
      const differs = new Set(values).size > 1;
      const isMatch = !query || norm(row.cells[0]?.textContent).includes(query);
      row.hidden = !isMatch || (differencesOnly && !differs);
      groupRows.push(row);
      if (!row.hidden) matches++;
    }
    endGroup();
    if (status) status.textContent = (query || differencesOnly) ? `${matches} özellik gösteriliyor` : '';
    if (empty) empty.hidden = matches > 0;
    queueStickySync();
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
  // Mirror the currently active original category heading below the fixed plan header.
  // The real rows remain in the document to preserve original layout and scrolling.
  const groupRows = [...table.tBodies[0].rows].filter(row => row.classList.contains('tc-table-group'));
  const groupHost = document.createElement('div');
  groupHost.className = 'tc-pricing-floating-group tc-comparison';
  groupHost.setAttribute('aria-hidden', 'true');
  groupHost.hidden = true;
  const groupTable = document.createElement('table');
  groupTable.className = 'tc-pricing-floating-table';
  const groupBody = document.createElement('tbody');
  groupTable.appendChild(groupBody);
  groupHost.appendChild(groupTable);
  document.body.appendChild(groupHost);
  let activeGroup = null;
  function syncFloatingGroup(top, headerHeight, tableWidth, regionLeft, regionWidth, scrollLeft, tableBottom) {
    const categoryTop = top + headerHeight;
    let current = null;
    let next = null;
    for (const row of groupRows) {
      if (row.hidden || !row.getClientRects().length) continue;
      const rect = row.getBoundingClientRect();
      if (rect.top <= categoryTop + 1) current = row;
      else { next = rect; break; }
    }
    const groupHeight = current ? Math.ceil(current.getBoundingClientRect().height) : 0;
    const visible = !!current && !cloneHost.hidden && tableBottom > categoryTop + groupHeight;
    groupHost.hidden = !visible;
    if (!visible) { activeGroup = null; return; }
    if (activeGroup !== current) {
      activeGroup = current;
      groupBody.replaceChildren(current.cloneNode(true));
      // Dynamic content is rendered from Master; use source markup for identical design.
      groupBody.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
    }
    groupHost.style.top = categoryTop + 'px';
    groupHost.style.left = regionLeft + 'px';
    groupHost.style.width = regionWidth + 'px';
    groupHost.style.height = groupHeight + 'px';
    groupTable.style.width = tableWidth + 'px';
    groupTable.style.transform = 'translateX(' + (-scrollLeft) + 'px)';
    // Allow the approaching category to push the current one away naturally.
    const nextTop = next?.top ?? Infinity;
    groupTable.style.marginTop = Math.min(0, nextTop - (categoryTop + groupHeight)) + 'px';
  }
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
    if (!shouldShow) { groupHost.hidden = true; activeGroup = null; return; }
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
    syncFloatingGroup(offset, height, tableRect.width, rect.left, rect.width, region.scrollLeft, tableRect.bottom);
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
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTicartiPricingComparison, { once: true });
} else {
  initTicartiPricingComparison();
}
