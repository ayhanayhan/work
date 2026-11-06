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
  syncStickyOffsets();
  window.addEventListener('resize', syncStickyOffsets, { passive: true });
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(syncStickyOffsets);
    observer.observe(thead);
    if (header) observer.observe(header);
  }
  refresh();
});
