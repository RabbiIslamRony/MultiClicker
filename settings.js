// ================================================================
//  MULTICLICKER — SETTINGS PAGE SCRIPT
// ================================================================

// ── Security: never log passwords ────────────────────────────────
// All user data inserted into the DOM goes through escapeHTML.

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = String(str ?? '');
  return div.innerHTML;
}

// ── Config state ──────────────────────────────────────────────────
let config = { categories: [] };

// ── Load on start ─────────────────────────────────────────────────
async function loadConfig() {
  const result = await chrome.storage.local.get('config');
  config = result.config ?? { categories: [] };
  renderAll();
}

// ── Save ───────────────────────────────────────────────────────────
async function saveConfig() {
  await chrome.storage.local.set({ config });
}

// ── ID generator ──────────────────────────────────────────────────
function newId(prefix) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

// ── Render everything ─────────────────────────────────────────────
function renderAll() {
  const list = document.getElementById('category-list');
  const emptyMsg = document.getElementById('empty-msg');
  list.innerHTML = '';

  if (!config.categories || config.categories.length === 0) {
    emptyMsg.classList.remove('hidden');
    return;
  }
  emptyMsg.classList.add('hidden');

  for (const cat of config.categories) {
    list.appendChild(buildCategoryCard(cat));
  }
}

// ── Build category card ───────────────────────────────────────────
function buildCategoryCard(cat) {
  const card = document.createElement('div');
  card.className = 'category-card';
  card.dataset.catId = cat.id;

  // Header
  const header = document.createElement('div');
  header.className = 'category-card-header';

  const dot = document.createElement('span');
  dot.className = 'category-color-dot';
  dot.style.background = cat.color || '#4f46e5';

  const nameEl = document.createElement('span');
  nameEl.className = 'category-card-name';
  nameEl.textContent = cat.name;

  const actions = document.createElement('div');
  actions.className = 'row-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'btn btn-ghost btn-sm';
  editBtn.textContent = 'Edit';
  editBtn.addEventListener('click', () => openCategoryModal(cat));

  const delBtn = document.createElement('button');
  delBtn.className = 'btn btn-ghost btn-sm';
  delBtn.textContent = 'Delete';
  delBtn.addEventListener('click', () => confirmDelete(
    `Delete category "${cat.name}" and all its sites and targets?`,
    () => {
      config.categories = config.categories.filter(c => c.id !== cat.id);
      saveConfig().then(renderAll);
    }
  ));

  actions.appendChild(editBtn);
  actions.appendChild(delBtn);
  header.appendChild(dot);
  header.appendChild(nameEl);
  header.appendChild(actions);

  // Body
  const body = document.createElement('div');
  body.className = 'category-card-body';

  for (const site of (cat.sites || [])) {
    body.appendChild(buildSiteBlock(cat, site));
  }

  // Add site button
  const addSiteRow = document.createElement('div');
  addSiteRow.className = 'category-add-site';
  const addSiteBtn = document.createElement('button');
  addSiteBtn.className = 'btn btn-ghost btn-sm';
  addSiteBtn.textContent = '+ Add Site';
  addSiteBtn.addEventListener('click', () => openSiteModal(cat, null));
  addSiteRow.appendChild(addSiteBtn);
  body.appendChild(addSiteRow);

  card.appendChild(header);
  card.appendChild(body);
  return card;
}

// ── Build site block ──────────────────────────────────────────────
function buildSiteBlock(cat, site) {
  const block = document.createElement('div');
  block.className = 'site-block';
  block.dataset.siteId = site.id;

  // Header
  const header = document.createElement('div');
  header.className = 'site-block-header';

  const nameEl = document.createElement('span');
  nameEl.className = 'site-block-name';
  nameEl.textContent = site.name;

  const actions = document.createElement('div');
  actions.className = 'row-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'btn btn-ghost btn-sm';
  editBtn.textContent = 'Edit';
  editBtn.addEventListener('click', () => openSiteModal(cat, site));

  const delBtn = document.createElement('button');
  delBtn.className = 'btn btn-ghost btn-sm';
  delBtn.textContent = 'Delete';
  delBtn.addEventListener('click', () => confirmDelete(
    `Delete site "${site.name}" and all its targets?`,
    () => {
      cat.sites = cat.sites.filter(s => s.id !== site.id);
      saveConfig().then(renderAll);
    }
  ));

  actions.appendChild(editBtn);
  actions.appendChild(delBtn);
  header.appendChild(nameEl);
  header.appendChild(actions);

  // Body
  const body = document.createElement('div');
  body.className = 'site-block-body';

  // Login summary (no raw password in DOM — show masked dots)
  const loginSum = document.createElement('div');
  loginSum.className = 'login-summary';

  const label = document.createElement('span');
  label.className = 'login-label';
  label.textContent = 'Login:';

  const urlVal = document.createElement('span');
  urlVal.className = 'login-val';
  try {
    const u = new URL(site.login?.url || '');
    urlVal.textContent = u.hostname || '—';
  } catch {
    urlVal.textContent = site.login?.url ? site.login.url.slice(0, 40) : '—';
  }

  const sep1 = document.createElement('span');
  sep1.className = 'login-sep';
  sep1.textContent = '|';

  const userVal = document.createElement('span');
  userVal.className = 'login-val';
  userVal.textContent = site.login?.username || '—';

  const sep2 = document.createElement('span');
  sep2.className = 'login-sep';
  sep2.textContent = '|';

  // Masked password: show bullet dots proportional to length but never expose actual value
  const passVal = document.createElement('span');
  passVal.className = 'login-val';
  const passLen = (site.login?.password || '').length;
  passVal.textContent = passLen > 0 ? '●'.repeat(Math.min(passLen, 10)) : '—';

  loginSum.appendChild(label);
  loginSum.appendChild(urlVal);
  loginSum.appendChild(sep1);
  loginSum.appendChild(userVal);
  loginSum.appendChild(sep2);
  loginSum.appendChild(passVal);
  body.appendChild(loginSum);

  // Target list
  for (const target of (site.targets || [])) {
    body.appendChild(buildTargetItem(cat, site, target));
  }

  // Add target button
  const addTargetRow = document.createElement('div');
  addTargetRow.className = 'site-toolbar';
  const addTargetBtn = document.createElement('button');
  addTargetBtn.className = 'btn btn-ghost btn-sm';
  addTargetBtn.textContent = '+ Add Target';
  addTargetBtn.addEventListener('click', () => openTargetModal(cat, site, null));
  addTargetRow.appendChild(addTargetBtn);
  body.appendChild(addTargetRow);

  block.appendChild(header);
  block.appendChild(body);
  return block;
}

// ── Build a target item row ───────────────────────────────────────
function buildTargetItem(cat, site, target) {
  const item = document.createElement('div');
  item.className = 'target-item';
  item.dataset.targetId = target.id;

  const dot = document.createElement('span');
  dot.className = 'target-enabled-dot' + (target.enabled === false ? ' disabled' : '');
  dot.title = target.enabled === false ? 'Disabled' : 'Enabled';

  const name = document.createElement('span');
  name.className = 'target-item-name';
  name.textContent = target.name;

  const status = document.createElement('span');
  status.className = 'target-item-status';
  status.textContent = target.enabled === false ? 'disabled' : 'enabled';

  const actions = document.createElement('div');
  actions.className = 'row-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'btn-link';
  editBtn.textContent = 'Edit';
  editBtn.addEventListener('click', () => openTargetModal(cat, site, target));

  const delBtn = document.createElement('button');
  delBtn.className = 'btn-link';
  delBtn.style.color = 'var(--color-danger)';
  delBtn.textContent = 'Delete';
  delBtn.addEventListener('click', () => confirmDelete(
    `Delete target "${target.name}"?`,
    () => {
      site.targets = site.targets.filter(t => t.id !== target.id);
      saveConfig().then(renderAll);
    }
  ));

  actions.appendChild(editBtn);
  actions.appendChild(delBtn);

  item.appendChild(dot);
  item.appendChild(name);
  item.appendChild(status);
  item.appendChild(actions);
  return item;
}

// ── Modal infrastructure ──────────────────────────────────────────
let modalSaveCallback = null;

function openModal(title, bodyHTML, onSave) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  document.getElementById('modal-overlay').classList.remove('hidden');
  modalSaveCallback = onSave;

  // Focus first input
  setTimeout(() => {
    const first = document.querySelector('#modal-body input, #modal-body select, #modal-body textarea');
    if (first) first.focus();
  }, 50);
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('modal-body').innerHTML = '';
  modalSaveCallback = null;
}

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-cancel').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});
document.getElementById('modal-save').addEventListener('click', () => {
  if (modalSaveCallback) modalSaveCallback();
});

// ── Category modal ────────────────────────────────────────────────
function openCategoryModal(existing) {
  const isEdit = !!existing;
  const title  = isEdit ? 'Edit Category' : 'Add Category';

  const bodyHTML = `
    <div class="form-group">
      <label class="form-label" for="f-cat-name">Name</label>
      <input class="form-input" type="text" id="f-cat-name"
        value="${escapeHTML(existing?.name ?? '')}"
        placeholder="e.g. My WordPress Sites" autocomplete="off" />
    </div>
    <div class="form-group">
      <label class="form-label" for="f-cat-color">Color</label>
      <input class="form-input" type="color" id="f-cat-color"
        value="${escapeHTML(existing?.color ?? '#4f46e5')}" />
    </div>
  `;

  openModal(title, bodyHTML, () => {
    const name  = document.getElementById('f-cat-name').value.trim();
    const color = document.getElementById('f-cat-color').value;

    if (!name) {
      showStatus('Category name is required.', 'error');
      return;
    }

    if (isEdit) {
      existing.name  = name;
      existing.color = color;
    } else {
      config.categories.push({
        id: newId('cat'),
        name,
        color,
        sites: [],
      });
    }

    saveConfig().then(() => {
      closeModal();
      renderAll();
    });
  });
}

// ── Site modal ────────────────────────────────────────────────────
function openSiteModal(cat, existing) {
  const isEdit = !!existing;
  const title  = isEdit ? 'Edit Site' : 'Add Site';

  const login = existing?.login ?? { url: '', username: '', password: '' };

  const bodyHTML = `
    <div class="form-group">
      <label class="form-label" for="f-site-name">Site Name</label>
      <input class="form-input" type="text" id="f-site-name"
        value="${escapeHTML(existing?.name ?? '')}"
        placeholder="e.g. Main Site" autocomplete="off" />
    </div>
    <div class="form-group">
      <label class="form-label" for="f-site-login-url">Login URL</label>
      <input class="form-input" type="text" id="f-site-login-url"
        value="${escapeHTML(login.url)}"
        placeholder="https://example.com/wp-login.php" autocomplete="off" />
    </div>
    <div class="form-group">
      <label class="form-label" for="f-site-username">Username</label>
      <input class="form-input" type="text" id="f-site-username"
        value="${escapeHTML(login.username)}"
        placeholder="admin@example.com" autocomplete="username" />
    </div>
    <div class="form-group">
      <label class="form-label" for="f-site-password">Password</label>
      <div class="password-wrapper">
        <input class="form-input" type="password" id="f-site-password"
          value="${escapeHTML(login.password)}"
          autocomplete="current-password" />
        <button type="button" class="btn-show-pass" id="btn-toggle-pass" title="Show/hide password" aria-label="Toggle password visibility">&#128065;</button>
      </div>
    </div>
  `;

  openModal(title, bodyHTML, () => {
    const name     = document.getElementById('f-site-name').value.trim();
    const loginUrl = document.getElementById('f-site-login-url').value.trim();
    const username = document.getElementById('f-site-username').value.trim();
    const password = document.getElementById('f-site-password').value; // not trimmed

    if (!name) {
      showStatus('Site name is required.', 'error');
      return;
    }

    if (isEdit) {
      existing.name  = name;
      existing.login = { url: loginUrl, username, password };
    } else {
      if (!cat.sites) cat.sites = [];
      cat.sites.push({
        id: newId('site'),
        name,
        login: { url: loginUrl, username, password },
        targets: [],
      });
    }

    saveConfig().then(() => {
      closeModal();
      renderAll();
    });
  });

  // Wire show/hide toggle after modal is injected
  setTimeout(() => {
    const toggleBtn = document.getElementById('btn-toggle-pass');
    const passInput = document.getElementById('f-site-password');
    if (toggleBtn && passInput) {
      toggleBtn.addEventListener('click', () => {
        const isPass = passInput.type === 'password';
        passInput.type = isPass ? 'text' : 'password';
        toggleBtn.textContent = isPass ? '🙈' : '👁';
      });
    }
  }, 0);
}

// ── Target modal ──────────────────────────────────────────────────
function openTargetModal(cat, site, existing) {
  const isEdit  = !!existing;
  const title   = isEdit ? 'Edit Target' : 'Add Target';
  const enabled = existing ? existing.enabled !== false : true;

  const bodyHTML = `
    <div class="form-group">
      <label class="form-label" for="f-tgt-name">Name</label>
      <input class="form-input" type="text" id="f-tgt-name"
        value="${escapeHTML(existing?.name ?? '')}"
        placeholder="e.g. Clear Cache" autocomplete="off" />
    </div>
    <div class="form-group">
      <label class="form-label" for="f-tgt-url">URL</label>
      <input class="form-input" type="text" id="f-tgt-url"
        value="${escapeHTML(existing?.url ?? '')}"
        placeholder="https://example.com/wp-admin/..." autocomplete="off" />
    </div>
    <div class="form-group">
      <label class="form-label" for="f-tgt-selector">CSS Selector</label>
      <input class="form-input" type="text" id="f-tgt-selector"
        value="${escapeHTML(existing?.selector ?? '')}"
        placeholder="#clear-cache-btn" autocomplete="off" />
    </div>
    <div class="form-group">
      <label class="form-label" for="f-tgt-confirm">
        Confirm Popup Selector
        <span class="form-optional">(optional)</span>
      </label>
      <input class="form-input" type="text" id="f-tgt-confirm"
        value="${escapeHTML(existing?.confirmSelector ?? '')}"
        placeholder=".sui-button-primary or #confirm-ok" autocomplete="off" />
      <span class="form-hint">If clicking the button opens a confirmation popup, put that popup's button selector here.</span>
    </div>
    <div class="form-group">
      <div class="form-checkbox-row">
        <input type="checkbox" id="f-tgt-enabled" ${enabled ? 'checked' : ''} />
        <label for="f-tgt-enabled">Enabled</label>
      </div>
    </div>
  `;

  openModal(title, bodyHTML, () => {
    const name            = document.getElementById('f-tgt-name').value.trim();
    const url             = document.getElementById('f-tgt-url').value.trim();
    const selector        = document.getElementById('f-tgt-selector').value.trim();
    const confirmSelector = document.getElementById('f-tgt-confirm').value.trim();
    const isEnabled       = document.getElementById('f-tgt-enabled').checked;

    if (!name)     { showStatus('Target name is required.',     'error'); return; }
    if (!url)      { showStatus('Target URL is required.',      'error'); return; }
    if (!selector) { showStatus('CSS selector is required.',    'error'); return; }

    if (isEdit) {
      existing.name            = name;
      existing.url             = url;
      existing.selector        = selector;
      existing.confirmSelector = confirmSelector || undefined;
      existing.enabled         = isEnabled;
    } else {
      if (!site.targets) site.targets = [];
      site.targets.push({
        id: newId('tgt'),
        name,
        url,
        selector,
        ...(confirmSelector && { confirmSelector }),
        enabled: isEnabled,
      });
    }

    saveConfig().then(() => {
      closeModal();
      renderAll();
    });
  });
}

// ── Confirm delete dialog ─────────────────────────────────────────
let confirmCallback = null;

function confirmDelete(message, onConfirm) {
  document.getElementById('confirm-message').textContent = message;
  document.getElementById('confirm-overlay').classList.remove('hidden');
  confirmCallback = onConfirm;
}

document.getElementById('confirm-cancel').addEventListener('click', () => {
  document.getElementById('confirm-overlay').classList.add('hidden');
  confirmCallback = null;
});

document.getElementById('confirm-ok').addEventListener('click', () => {
  document.getElementById('confirm-overlay').classList.add('hidden');
  if (confirmCallback) {
    confirmCallback();
    confirmCallback = null;
  }
});

document.getElementById('confirm-overlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('confirm-overlay')) {
    document.getElementById('confirm-overlay').classList.add('hidden');
    confirmCallback = null;
  }
});

// ── Status bar ────────────────────────────────────────────────────
let statusTimer = null;

function showStatus(message, type = 'success') {
  const bar = document.getElementById('status-bar');
  bar.textContent = message;
  bar.className = `status-bar ${type}`;
  bar.classList.remove('hidden');
  if (statusTimer) clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    bar.classList.add('hidden');
  }, 3500);
}

// ── Add Category button ───────────────────────────────────────────
document.getElementById('btn-add-category').addEventListener('click', () => {
  openCategoryModal(null);
});

// ── Export JSON ───────────────────────────────────────────────────
document.getElementById('btn-export').addEventListener('click', async () => {
  const { config: cfg } = await chrome.storage.local.get('config');
  const json = JSON.stringify(cfg ?? { categories: [] }, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'multiclicker-config.json';
  a.click();
  URL.revokeObjectURL(url);
  showStatus('Config exported successfully.');
});

// ── Import JSON ───────────────────────────────────────────────────
document.getElementById('btn-import').addEventListener('click', () => {
  document.getElementById('import-file-input').click();
});

document.getElementById('import-file-input').addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  e.target.value = ''; // reset so same file can be re-imported

  const reader = new FileReader();
  reader.onload = async (ev) => {
    let parsed;
    try {
      parsed = JSON.parse(ev.target.result);
    } catch {
      showStatus('Invalid JSON file.', 'error');
      return;
    }

    if (!validateImportedConfig(parsed)) {
      showStatus('Invalid config structure. Expected { categories: [...] }.', 'error');
      return;
    }

    await chrome.storage.local.set({ config: parsed });
    showStatus('Config imported successfully.');
    loadConfig();
  };
  reader.readAsText(file);
});

// ── Validate imported config shape ───────────────────────────────
function validateImportedConfig(obj) {
  if (!obj || typeof obj !== 'object') return false;
  if (!Array.isArray(obj.categories)) return false;
  for (const cat of obj.categories) {
    if (typeof cat.name !== 'string') return false;
    if (!Array.isArray(cat.sites)) return false;
    for (const site of cat.sites) {
      if (typeof site.name !== 'string') return false;
      if (!Array.isArray(site.targets)) return false;
    }
  }
  return true;
}

// ── Bootstrap ─────────────────────────────────────────────────────
loadConfig();
