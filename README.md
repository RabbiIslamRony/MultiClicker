# ⚡ MultiClicker — Chrome Extension

A minimal Chrome extension to automate button clicks across multiple WordPress sites with one click.  
Organise sites into **categories**, store separate login credentials per site, and trigger  
any number of admin-page buttons — all without leaving your browser.

---

## Features

- **Category → Site → Target** hierarchy — group multiple sites cleanly  
- **Per-site login** — each site has its own WordPress credentials (stored encrypted)  
- **Confirm-popup support** — if a button triggers a confirmation modal, it clicks that too  
- **Run All** — trigger every target in a category with one button  
- **Status feedback** — live idle / running / success / error indicators per target  
- **Settings UI** — add, edit, delete categories, sites and targets without touching code  
- **Export / Import** — back up or share your config as a JSON file  
- **Minimal design** — 360 px popup, no clutter  

---

## Installation

### Option A — Load unpacked (Developer / Open Source)

> No Chrome Web Store account needed. Works immediately.

1. **Download or clone** this repository
   ```
   git clone https://github.com/RabbiIslamRony/MultiClicker
   ```

2. **Generate icons** (one-time setup, requires [Node.js](https://nodejs.org))
   ```bash
   npm install
   npm run setup:icons
   ```

3. **Open Chrome** and go to `chrome://extensions`

4. Enable **Developer mode** (toggle in the top-right corner)

5. Click **Load unpacked** → select the `extension/` folder

6. The ⚡ icon will appear in your Chrome toolbar

---

### Option B — Install from the built zip

1. Run the build script to create a distributable zip:
   ```bash
   npm run build
   ```
   This creates `multiclicker-extension.zip` in the project root.

2. Extract the zip to a folder

3. Follow steps 3–6 from Option A, selecting the extracted folder

---

## First-Time Setup

After installing, you need to add your site credentials:

1. Click the **⚡** icon in the toolbar
2. Click the **⚙** (Settings) button
3. Find your site under a category → click **Edit**
4. Fill in:
   - **Login URL** — your WordPress login page (e.g. `https://yoursite.com/wp-login.php`)
   - **Username** — your WordPress username or email
   - **Password** — your WordPress password
5. Click **Save**

> Passwords are stored in Chrome's `chrome.storage.local`, which is encrypted by
> Chrome using your operating system's keychain. They are never sent anywhere except
> directly to your own WordPress login page.

---

## Usage

### Clear a single target

1. Click the **⚡** icon
2. Find the target you want to clear
3. Click **Clear**
4. Watch the status dot:
   - 🔵 pulsing = running
   - 🟢 = success (resets after 3 s)
   - 🔴 = failed (hover the button to see the error)

### Clear all targets in a category

Click **Run All** next to the category name — targets clear sequentially.

### Collapse / expand a category

Click anywhere on the category header bar.

---

## Adding Targets, Sites and Categories

Everything is managed in the **Settings** page (click ⚙ in the popup).

### Add a new target

1. Find the site it belongs to → click **+ Add Target**
2. Fill in:
   | Field | Description |
   |---|---|
   | **Name** | Friendly label shown in the popup |
   | **URL** | Full URL of the WordPress admin page |
   | **CSS Selector** | Selector of the button to click (see below) |
   | **Confirm Popup Selector** | *(optional)* If the button opens a confirmation modal, the selector of the confirm button inside that modal |
   | **Enabled** | Uncheck to skip without deleting |

3. Click **Save**

**How to find the CSS selector:**
1. Open the target admin page in Chrome
2. Right-click the cache-clear button → **Inspect**
3. In DevTools, right-click the highlighted element → **Copy → Copy selector**
4. Paste it in the **CSS Selector** field

### Add a new site

Inside a category → click **+ Add Site** → fill in name and login details.

### Add a new category

Click **+ Add Category** at the top of Settings → choose a name and colour.

---

## Export & Import Config

You can back up or share your entire configuration (including credentials):

- **Export** — Settings → **Export JSON** → downloads `multiclicker-config.json`
- **Import** — Settings → **Import JSON** → select a previously exported file

> ⚠️ The exported JSON includes passwords in plain text. Keep it secure and
> do not share it publicly.

---

## Building from Source

### Requirements

- [Node.js](https://nodejs.org) v18+
- Google Chrome (for icon generation)

### Setup

```bash
git clone https://github.com/RabbiIslamRony/MultiClicker
cd MultiClicker
npm install
```

### Generate icons

```bash
npm run setup:icons
```

Creates `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png`.

### Build the distributable zip

```bash
npm run build
```

Outputs `multiclicker-extension.zip` — ready for manual distribution or
Chrome Web Store upload.

### Project structure

```
extension/
├── manifest.json          MV3 manifest
├── background.js          Service worker — handles tab automation & login
├── default-config.js      Seed config loaded on first install
├── popup.html/css/js      Extension popup (360 px)
├── settings.html/css/js   Full-page settings with CRUD UI
├── build.js               Build script → produces .zip
└── icons/
    ├── generate-icons.js  Generates PNG icons via puppeteer
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## Security

| What | How |
|---|---|
| Passwords at rest | Stored in `chrome.storage.local` — encrypted by Chrome using OS keychain |
| Passwords in UI | Masked by default; show/hide toggle in Settings |
| Passwords in DOM | Never written as HTML attributes or text nodes |
| Console logging | Passwords are never logged |
| Network | Credentials are only submitted to your own WordPress login page |
| Extension permissions | `storage`, `tabs`, `scripting`, `<all_urls>` — required to open tabs and click buttons on any admin page you configure |

---

## Contributing

Pull requests are welcome!

1. Fork the repository
2. Create a branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Test by loading the `extension/` folder as an unpacked extension
5. Run `npm run build` to verify the build passes
6. Open a pull request

Please keep the design minimal and avoid adding external dependencies to the extension itself (the extension folder must stay dependency-free for Chrome compatibility).

---

## Disclaimer

> **Use at your own risk.**  
> This extension interacts with third-party websites using credentials you provide. The author(s) accept **no liability** for data loss, unintended actions, account lockouts, or any other consequences arising from its use. Always verify selectors in a safe environment before running automation on production sites.  
> Credentials are stored locally in Chrome's `chrome.storage.local` and are **never transmitted** to any server other than your own configured login pages.

---

---

---

## 🏢 Acknowledgement

This project is partially based on real-world development experience from **SovWare**.

🌐 https://www.sovware.com

> Note: This is an independent project and not officially affiliated with SovWare.

---

## Licence

[MIT](LICENSE)

---

## Acknowledgements

Built with [Puppeteer](https://pptr.dev) (icon generation only) and the
[Chrome Extensions API](https://developer.chrome.com/docs/extensions).
