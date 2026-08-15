# Project Structure

```
phisdetect/
├── .gitignore                      # Tells Git which files to skip (venv, models, logs, secrets)
├── README.md                       # The front-page readme: what the app is and how to run it
│
├── intel/                          # The internal documentation (this folder)
│   ├── structure.md                # This file — the map of every folder and file
│   ├── requirements.md             # Every package and service the project needs, and why
│   ├── installguide.md             # Step-by-step beginner guide to installing and running the app
│   ├── backendlogic.md             # Deep dive into how the backend turns a URL/email into a verdict
│   └── model.md                    # Deep dive into the three AI models: data, training, retraining
│
├── backend/                        # The server side (a Flask Python API)
│   ├── server.py                   # The whole backend brain: scans, sign-in, scores, and all API calls
│   ├── .env                        # Your local secrets file (not in Git) — holds the MongoDB connection string
│   └── data/
│       └── minigame_scores.json    # Leftover from an older version — scores now go to MongoDB instead
│
├── frontend/                       # The web pages users actually see and click
│   ├── index.html                  # The main page: the URL, email and QR scanners
│   ├── auth.html                   # The Sign In / Sign Up page
│   ├── dashboard.html              # The Dashboard page: your scans, points, reports and history
│   ├── minigames.html              # The Minigames page: three training games plus the leaderboard
│   ├── help.html                   # The Help / FAQ page about phishing and the tool
│   ├── serve.py                    # A tiny local server for the frontend (port 8000, no caching)
│   ├── css/                        # All the styling that makes the pages look "terminal"
│   │   ├── main.css                # The base look: colors, fonts, buttons, cards
│   │   ├── layout.css              # Arranges the page skeleton: sidebar, top bar, content area
│   │   ├── components.css          # Styling for reusable pieces: modals, dropdowns, badges, games
│   │   ├── terminal.css            # The terminal-window style: traffic-light dots, title bars, borders
│   │   ├── status.css              # The green/yellow/red verdict colors and glows
│   │   ├── results.css             # Styling for the scan-results panel after a check
│   │   └── responsive.css          # Keeps everything looking good on phones and tablets
│   └── js/                         # All the browser-side logic
│       ├── app.js                  # The starter: loads the right page module for the page you opened
│       ├── auth.js                 # Sign in/up, logout, and keeping your login token in the browser
│       ├── utils.js                # Shared helpers: toast popups, confirm dialogs, clipboard, etc.
│       ├── theme.js                # Dark/light mode switching, remembered in your browser
│       ├── navigation.js           # Makes the sidebar links work and handles logout
│       ├── notifications.js        # Powers the bell icon and the alert dropdown in the top bar
│       ├── profile.js              # Shows your name, points and reports in the profile dropdown
│       ├── scanner.js              # The scanner's browser brain: calls the backend and draws results
│       ├── dashboard.js            # Fills the dashboard with your stats and activity log
│       ├── minigames.js            # All three games plus the leaderboard: questions, scoring, timers
│       └── faq.js                  # Expands/collapses the FAQ answers and filters them by category
│
└── model/                          # The machine-learning part (the "brain")
    ├── requirements.txt            # The list of Python packages to install to train or run the models
    ├── data/                       # Raw email data used to teach the models
    │   ├── easy_ham.tar.bz2        # A compressed folder of real, everyday (non-scam) emails
    │   ├── email_text_dataset.jsonl# Cleaned email samples (safe + scam), ready for training
    │   ├── phishing0.mbox          # Real phishing emails, used as "dangerous" examples (part 1)
    │   ├── phishing1.mbox          # Real phishing emails, used as "dangerous" examples (part 2)
    │   ├── phishing2.mbox          # Real phishing emails, used as "dangerous" examples (part 3)
    │   └── phishing3.mbox          # Real phishing emails, used as "dangerous" examples (part 4)
    ├── lists/                      # Big lists of real/known websites
    │   ├── openphish_hosts.txt     # Known phishing site domains (the "block list")
    │   ├── tranco_top100k.txt      # The 100,000 most-visited real websites
    │   └── tranco_top1m.txt        # The top 1,000,000 most-visited real websites (the "allow list")
    ├── lookup/                     # Small reference lists
    │   ├── shorteners.txt          # Known URL-shortener domains (bit.ly, etc.)
    │   └── tlds.txt                # Every top-level domain ending (.com, .org, .uk…)
    ├── src/                        # The training scripts (developer tools)
    │   ├── extract_features.py     # Turns a URL into ~100 numbers (features) the model can read
    │   ├── email_text_features.py  # Cleans raw email text so the email model can read it
    │   ├── url_text_features.py    # Turns a URL into words/word-pieces for the URL-word model
    │   ├── augment_dataset.py      # Makes extra training examples from real domains' URLs
    │   ├── train.py                # Trains the main phishing model from the CSV tables
    │   ├── train_email_text_model.py# Trains the email-word model from the email dataset
    │   ├── train_url_text_model.py # Trains the URL-word model (downloads fresh phishing feeds first)
    │   ├── update_email_data.py    # Rebuilds the email training dataset from the raw mailboxes
    │   └── update_lists.py         # Downloads fresh copies of the popular-site and phishing lists
    └── trained/                    # The finished model files (output of training)
        ├── dataset_small.csv       # The small base training table (URL features + labels)
        ├── dataset_augmented.csv   # The same table expanded with extra generated examples
        ├── features.txt            # The ordered names of the features the main model uses
        ├── phishing_model.joblib   # The trained main model (~403 MB; generated, not in Git)
        ├── url_text_model.joblib   # The trained URL-word model (generated, not in Git)
        └── email_text_model.joblib # The trained email-word model (generated, not in Git)
```

## What each file does

### Root files

- **`.gitignore`** — Tells Git which files to *not* track: the virtual environment (`model/venv/`), the generated model files, runtime logs, and secret files like `.env`. Anything listed here never gets uploaded.
- **`README.md`** — The project's front page. Written for humans: what PhisDetect is, what it does, how the scanning works, and the quickest way to run it.

### `intel/`

- **`structure.md`** — This file. The folder/file map you are reading right now.
- **`requirements.md`** — The full list of environment and dependency requirements: Python version, every package and why it is there, the frontend's CDN libraries, and the live network services the scanner talks to.
- **`installguide.md`** — A beginner-friendly, step-by-step guide that takes you from downloading the files to having the app running in your browser.
- **`backendlogic.md`** — A deep dive into how the backend turns a URL or email into a verdict: the scan pipelines, heuristics, enrichment checks, scoring, caching, and every API endpoint.
- **`model.md`** — A deep dive into the three AI models: what each one learns, the data used to train them, how they were validated, and how to retrain them.

### `backend/`

- **`server.py`** — The heart of the app. It loads the trained models at startup, runs every URL/email scan, creates and verifies user accounts, records scan history and game scores, and answers all the API calls the web app makes.
- **`.env`** — A file you create yourself (it is never committed to Git) holding secrets the server reads at startup — most importantly the MongoDB connection string (`MONGO_URI`). If it is empty, the server still starts but accounts and leaderboards are unavailable.
- **`data/minigame_scores.json`** — A leftover from an earlier version of the app. Game scores used to be saved here; they are now stored in MongoDB, so the server no longer reads or writes this file.

> **Note on storage:** the backend uses a MongoDB database (Atlas) for accounts, minigame scores, scan history, threat reports, and user stats. It connects to the database whose address you put in `.env`. Without a database the scanner itself still works — only the account, leaderboard, and dashboard features are missing.

### `frontend/`

- **`index.html`** — The main Scanner page: paste a URL, email, or QR code and hit scan to get a verdict.
- **`auth.html`** — The Sign In / Sign Up page. Create an account or log in with your email and password so your scans, points and reports are saved.
- **`dashboard.html`** — Your overview page: total scans, threats detected, reports submitted, points earned, and a recent activity log.
- **`minigames.html`** — The arcade: three training games (Phish or Legit, Link Dismantler, Threat Hunt) plus the global leaderboard.
- **`help.html`** — The Help / FAQ page, where users learn about phishing and how the tool works.
- **`serve.py`** — A tiny development server that serves the frontend on port 8000 with caching disabled, so the browser always picks up your latest JS/CSS changes. Use it instead of `python -m http.server`.
- **`css/main.css`** — The base design system: fonts, colors, buttons, and cards used everywhere.
- **`css/layout.css`** — Arranges the page skeleton: the sidebar, top bar, and content area.
- **`css/components.css`** — Styling for reusable pieces: modals, dropdowns, badges, the leaderboard, and all the game screens.
- **`css/terminal.css`** — Makes panels look like a hacker terminal: the traffic-light dots, title bars, and borders.
- **`css/status.css`** — The green/yellow/red verdict colors and glows.
- **`css/results.css`** — Styling for the scan report that appears after a check.
- **`css/responsive.css`** — Fixes the layout so it still looks good on phones and small screens.
- **`js/app.js`** — The starter: decides which page module to load based on the page you opened.
- **`js/auth.js`** — Handles accounts in the browser: sign in, sign up, logout, and keeping your login token in `localStorage`. It calls the backend's `/api/auth/*` routes.
- **`js/utils.js`** — Shared little helpers used everywhere: toast popups, confirm dialogs, clipboard copy, and text formatting.
- **`js/theme.js`** — Switches between dark and light mode and remembers your choice.
- **`js/navigation.js`** — Makes the sidebar links work and handles logging out.
- **`js/notifications.js`** — Powers the bell icon and the list of alerts in the top bar.
- **`js/profile.js`** — Manages the name, points, and reports shown in the profile dropdown (local for guests, synced with the server when logged in).
- **`js/scanner.js`** — The scanner's browser brain: sends URLs/emails to the backend and draws the results, and decodes QR codes with jsQR.
- **`js/dashboard.js`** — Fills the dashboard with your stats and activity log.
- **`js/minigames.js`** — All three games and the leaderboard: question banks, difficulty, scoring, and timers.
- **`js/faq.js`** — Opens and closes the FAQ answers and filters them by category.

### `model/`

- **`requirements.txt`** — The list of Python packages to install before training or running the models. This is the project's only real dependency manifest.
- **`data/easy_ham.tar.bz2`** — A compressed folder of real, everyday (non-scam) emails, used as the "safe" examples for the email model.
- **`data/email_text_dataset.jsonl`** — Cleaned email samples (both safe and scam) used to train the email model.
- **`data/phishing0.mbox`** through **`phishing3.mbox`** — Four files of real phishing emails, used as the "dangerous" examples for the email model.
- **`lists/openphish_hosts.txt`** — Domains known to host phishing pages. The backend treats these as the "block list".
- **`lists/tranco_top100k.txt`** — The 100,000 most-visited real websites.
- **`lists/tranco_top1m.txt`** — The top 1,000,000 most-visited real websites. The backend treats these as the trusted "allow list".
- **`lookup/shorteners.txt`** — Known URL-shortener domains (bit.ly and friends).
- **`lookup/tlds.txt`** — Every top-level domain ending (.com, .org, .io, .uk…), used to count TLDs in URLs.
- **`src/extract_features.py`** — Translates a URL into the ~100 numbers ("features") the main model scores. It is also what the backend imports at runtime.
- **`src/email_text_features.py`** — Cleans raw email text (strips HTML, hides URLs/emails/numbers) so the email model can read it.
- **`src/url_text_features.py`** — Turns a URL into words and word-pieces for the URL-word model.
- **`src/augment_dataset.py`** — Generates extra training examples by building realistic URLs from real domains, so the main model learns better.
- **`src/train.py`** — Trains the main phishing model from the CSV training tables and saves `phishing_model.joblib` plus `features.txt`.
- **`src/train_email_text_model.py`** — Trains the email-word model from the email dataset.
- **`src/train_url_text_model.py`** — Trains the URL-word model. Needs internet: it downloads fresh phishing feeds first.
- **`src/update_email_data.py`** — Rebuilds the email training dataset from the raw mailbox files.
- **`src/update_lists.py`** — Downloads fresh copies of the popular-site and phishing lists.
- **`trained/dataset_small.csv`** — The small base training table of URL examples and their labels.
- **`trained/dataset_augmented.csv`** — The same training table, expanded with the extra generated examples.
- **`trained/features.txt`** — The ordered names of the inputs the main model uses. The backend re-slices features using this list.
- **`trained/phishing_model.joblib`** — The finished main model (~403 MB). Generated by `train.py`, so it is not in Git.
- **`trained/url_text_model.joblib`** — The finished URL-word model. Generated, not in Git.
- **`trained/email_text_model.joblib`** — The finished email-word model. Generated, not in Git.

## Files you may see that are not part of the project

A few folders and files appear on disk but are **not** tracked by Git. They are created by your own setup and can be safely ignored or deleted:

| Item | What it is |
|------|------------|
| `model/venv/` | The Python virtual environment you create during setup (root `venv/` also matches `.gitignore` but is not used) |
| `__pycache__/`, `*.pyc` | Python's automatic byte-code caches |
| `server.log`, `serve.log` | Runtime log files written by the servers when you run them |
| `backend/.env` | Your local secrets file (also listed above in the tree) |
| `model/trained/*.joblib` | The trained models, regenerated by the training scripts |
