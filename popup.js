// ================================================================
//  MULTICLICKER — POPUP SCRIPT
// ================================================================

// ── State: target ID → { status, error } ─────────────────────────
const targetState = {};

// ── Load config from storage and render ──────────────────────────
async function init() {
  const { config } = await chrome.storage.local.get('config');

  const categoryList = document.getElementById('category-list');
  const emptyState   = document.getElementById('empty-state');

  const categories = config?.categories ?? [];
  const hasTargets = categories.some(cat =>
    cat.sites?.some(site => site.targets?.some(t => t.enabled !== false))
  );

  if (!hasTargets) {
    categoryList.classList.add('hidden');
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  categoryList.innerHTML = '';

  for (const category of categories) {
    categoryList.appendChild(buildCategoryEl(category));
  }
}

// ── Build a category element ──────────────────────────────────────
function buildCategoryEl(category) {
  const color = category.color || '#4f46e5';

  const wrapper = document.createElement('div');
  wrapper.className = 'category-row open';
  wrapper.dataset.categoryId = category.id;
  wrapper.style.borderLeftColor = color;

  // Header
  const header = document.createElement('div');
  header.className = 'category-header';
  header.innerHTML = `
    <span class="category-chevron">&#9658;</span>
    <span class="category-name"></span>
    <button class="btn-run-all" data-category-id="${escAttr(category.id)}">Run All</button>
  `;
  header.querySelector('.category-name').textContent = category.name;

  // Toggle collapse on header click (but not on Run All button)
  header.addEventListener('click', (e) => {
    if (e.target.closest('.btn-run-all')) return;
    wrapper.classList.toggle('open');
  });

  // Run All button
  const runAllBtn = header.querySelector('.btn-run-all');
  runAllBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    runAllForCategory(category, runAllBtn);
  });

  // Body
  const body = document.createElement('div');
  body.className = 'category-body';

  for (const site of (category.sites || [])) {
    const enabledTargets = (site.targets || []).filter(t => t.enabled !== false);
    if (enabledTargets.length === 0) continue;
    body.appendChild(buildSiteEl(site, category));
  }

  wrapper.appendChild(header);
  wrapper.appendChild(body);
  return wrapper;
}

// ── Build a site section element ──────────────────────────────────
function buildSiteEl(site, category) {
  const section = document.createElement('div');
  section.className = 'site-section';
  section.dataset.siteId = site.id;

  // Only show site name label if there are multiple sites in the category
  const siblingCount = category.sites?.length ?? 0;
  if (siblingCount > 1) {
    const nameEl = document.createElement('div');
    nameEl.className = 'site-name';
    nameEl.textContent = site.name;
    section.appendChild(nameEl);
  }

  const enabledTargets = (site.targets || []).filter(t => t.enabled !== false);
  for (const target of enabledTargets) {
    section.appendChild(buildTargetRow(target, site.login));
  }

  return section;
}

// ── Build a single target row ─────────────────────────────────────
function buildTargetRow(target, login) {
  // Init state
  if (!targetState[target.id]) {
    targetState[target.id] = { status: 'idle', error: null };
  }

  const row = document.createElement('div');
  row.className = 'target-row';
  row.dataset.targetId = target.id;

  const dot = document.createElement('span');
  dot.className = 'status-dot';
  dot.title = '';

  const name = document.createElement('span');
  name.className = 'target-name';
  name.textContent = target.name;

  const btn = document.createElement('button');
  btn.className = 'btn-clear';
  btn.textContent = 'Clear';

  btn.addEventListener('click', () => clearTarget(target, login, btn, dot));

  row.appendChild(dot);
  row.appendChild(name);
  row.appendChild(btn);

  applyTargetState(target.id, dot, btn);
  return row;
}

// ── Apply visual state to a target row ───────────────────────────
function applyTargetState(targetId, dot, btn) {
  const state = targetState[targetId] || { status: 'idle' };

  dot.className = 'status-dot';
  btn.className = 'btn-clear';

  switch (state.status) {
    case 'idle':
      btn.textContent = 'Clear';
      btn.disabled = false;
      btn.title = '';
      break;
    case 'running':
      dot.classList.add('running');
      btn.textContent = '…';
      btn.disabled = true;
      btn.title = '';
      break;
    case 'success':
      dot.classList.add('success');
      btn.classList.add('success');
      btn.textContent = 'Done ✓';
      btn.disabled = false;
      btn.title = '';
      break;
    case 'error':
      dot.classList.add('error');
      btn.classList.add('error');
      btn.textContent = 'Failed';
      btn.disabled = false;
      btn.title = state.error || 'Unknown error';
      break;
  }
}

// ── Clear a single target ─────────────────────────────────────────
async function clearTarget(target, login, btn, dot) {
  setTargetStatus(target.id, 'running', null, btn, dot);

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'CLEAR_TARGET',
      target,
      login,
    });

    if (response?.ok) {
      setTargetStatus(target.id, 'success', null, btn, dot);
      // Auto-reset to idle after 3 seconds
      setTimeout(() => {
        setTargetStatus(target.id, 'idle', null, btn, dot);
      }, 3000);
    } else {
      setTargetStatus(target.id, 'error', response?.error || 'Unknown error', btn, dot);
    }
  } catch (err) {
    setTargetStatus(target.id, 'error', err.message || String(err), btn, dot);
  }
}

// ── Set and persist target status ────────────────────────────────
function setTargetStatus(targetId, status, error, btn, dot) {
  targetState[targetId] = { status, error };
  applyTargetState(targetId, dot, btn);
}

// ── Run all enabled targets in a category sequentially ───────────
async function runAllForCategory(category, runAllBtn) {
  runAllBtn.disabled = true;
  runAllBtn.textContent = '…';

  for (const site of (category.sites || [])) {
    const enabledTargets = (site.targets || []).filter(t => t.enabled !== false);

    for (const target of enabledTargets) {
      const row = document.querySelector(`[data-target-id="${escAttr(target.id)}"]`);
      if (!row) continue;

      const btn = row.querySelector('.btn-clear');
      const dot = row.querySelector('.status-dot');

      await clearTarget(target, site.login, btn, dot);
    }
  }

  runAllBtn.disabled = false;
  runAllBtn.textContent = 'Run All';
}

// ── Escape attribute values (for data-* attrs in strings) ────────
function escAttr(str) {
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── Wire up static buttons ────────────────────────────────────────
document.getElementById('btn-settings').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById('btn-go-settings')?.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// ── Bootstrap ─────────────────────────────────────────────────────
init();
