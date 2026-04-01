// ================================================================
//  MULTICLICKER — BACKGROUND SERVICE WORKER
// ================================================================

// ── Default config (inlined so service worker is self-contained) ──
const DEFAULT_CONFIG = {
  categories: [],
};

// ── Seed default config on install ────────────────────────────────
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    const existing = await chrome.storage.local.get('config');
    if (!existing.config) {
      await chrome.storage.local.set({ config: DEFAULT_CONFIG });
    }
  }
});

// ── Wait for a tab to finish loading ──────────────────────────────
// Adds listener BEFORE checking current status to avoid race condition.
function waitForTabLoad(tabId, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error('Tab load timed out'));
    }, timeoutMs);

    function listener(id, changeInfo) {
      if (id !== tabId || changeInfo.status !== 'complete') return;
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(listener);
      // Extra 300ms for JS to settle after DOM load
      setTimeout(resolve, 300);
    }

    // Register listener first, then check current state
    chrome.tabs.onUpdated.addListener(listener);

    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          chrome.tabs.onUpdated.removeListener(listener);
          reject(new Error(chrome.runtime.lastError.message));
        }
        return;
      }
      // If already complete when we checked, resolve immediately
      if (tab.status === 'complete' && !settled) {
        settled = true;
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        setTimeout(resolve, 300);
      }
    });
  });
}

// ── WordPress login via scripting ─────────────────────────────────
async function wpLogin(tabId, login) {
  // Navigate to login page
  await chrome.tabs.update(tabId, { url: login.url });
  await waitForTabLoad(tabId);

  // Fill in credentials and submit — uses native value setter to trigger React events
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (username, password) => {
      const nativeInputSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value'
      ).set;

      const userField = document.querySelector('#user_login');
      const passField = document.querySelector('#user_pass');

      if (!userField || !passField) {
        throw new Error('Login form fields not found');
      }

      userField.focus();
      nativeInputSetter.call(userField, '');
      userField.dispatchEvent(new Event('input', { bubbles: true }));
      nativeInputSetter.call(userField, username);
      userField.dispatchEvent(new Event('input', { bubbles: true }));
      userField.dispatchEvent(new Event('change', { bubbles: true }));

      passField.focus();
      nativeInputSetter.call(passField, '');
      passField.dispatchEvent(new Event('input', { bubbles: true }));
      nativeInputSetter.call(passField, password);
      passField.dispatchEvent(new Event('input', { bubbles: true }));
      passField.dispatchEvent(new Event('change', { bubbles: true }));

      document.querySelector('#wp-submit').click();
    },
    args: [login.username, login.password],
  });

  await waitForTabLoad(tabId);

  // Verify we are no longer on the login page
  const tab = await chrome.tabs.get(tabId);
  if (tab.url && tab.url.includes('wp-login.php')) {
    throw new Error('Login failed — check credentials in Settings');
  }
}

// ── Clear a single cache target ───────────────────────────────────
async function clearTarget(target, login) {
  let tabId = null;

  try {
    // Open tab in background (not active so user's current tab stays focused)
    const tab = await chrome.tabs.create({ url: target.url, active: false });
    tabId = tab.id;
    await waitForTabLoad(tabId);

    // Check if we landed on a login page
    const currentTab = await chrome.tabs.get(tabId);
    if (currentTab.url && currentTab.url.includes('wp-login.php')) {
      if (!login || !login.username || !login.password) {
        throw new Error('Login required but no credentials set — open Settings');
      }
      await wpLogin(tabId, login);
      // Navigate back to the target URL after login
      await chrome.tabs.update(tabId, { url: target.url });
      await waitForTabLoad(tabId);
    }

    // Wait for element, click it, then optionally click a confirm popup
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: (selector, confirmSelector, timeoutMs) => {
        return new Promise((resolve, reject) => {
          const deadline = Date.now() + timeoutMs;

          function tryFind() {
            const el = document.querySelector(selector);
            if (el) {
              el.click();

              // If a confirmSelector is set, wait up to 5s for it to appear AND be visible
              if (confirmSelector) {
                const confirmDeadline = Date.now() + 5000;

                function tryConfirm() {
                  const confirmEl = document.querySelector(confirmSelector);
                  if (confirmEl) {
                    const s = window.getComputedStyle(confirmEl);
                    const visible = s.display !== 'none' && s.visibility !== 'hidden';
                    if (visible) {
                      // Full mouse event sequence — works with React, Vue, jQuery and native
                      try { confirmEl.focus(); } catch (_) {}
                      ['mouseenter','mouseover','mousedown','mouseup','click'].forEach(type => {
                        confirmEl.dispatchEvent(
                          new MouseEvent(type, { bubbles: true, cancelable: true, view: window })
                        );
                      });
                      confirmEl.click(); // native fallback
                      resolve({ ok: true });
                      return;
                    }
                  }
                  if (Date.now() > confirmDeadline) {
                    // Popup never appeared — main click was still done, treat as success
                    resolve({ ok: true });
                    return;
                  }
                  setTimeout(tryConfirm, 150);
                }
                setTimeout(tryConfirm, 800); // wait for popup animation to finish
              } else {
                resolve({ ok: true });
              }
              return;
            }
            if (Date.now() > deadline) {
              reject(new Error(`Element not found within ${timeoutMs / 1000}s — selector: ${selector}`));
              return;
            }
            setTimeout(tryFind, 200);
          }

          tryFind();
        });
      },
      args: [target.selector, target.confirmSelector || null, 10000],
    });

    // Wait 1500ms for the page to process the click(s)
    await new Promise(r => setTimeout(r, 1500));

    const result = results[0];
    if (result.error) {
      throw new Error(result.error.message || 'Script execution failed');
    }

    return { ok: true };

  } catch (err) {
    return { ok: false, error: err.message || String(err) };

  } finally {
    if (tabId !== null) {
      try {
        await chrome.tabs.remove(tabId);
      } catch {
        // Tab may already be closed — ignore
      }
    }
  }
}

// ── Message handler ───────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'CLEAR_TARGET') {
    clearTarget(message.target, message.login)
      .then(sendResponse)
      .catch(err => sendResponse({ ok: false, error: err.message || String(err) }));
    return true; // Keep message channel open for async response
  }
});
