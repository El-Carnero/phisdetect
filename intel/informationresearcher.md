# Information Researcher — PhisDetect Study Guide

**Role copy:** this document is the one-stop index of everything used to build
PhisDetect. It lists the **tech stack**, **datasets**, **methodologies**,
**references** and key **concepts** so you can research each item and speak
confidently about it in the vivas. Every fact was checked directly against the
code — treat it as your source of truth, and verify anything you're unsure of
against the deeper docs listed in §6.

---

## 1. The project in one breath

PhisDetect is a **local phishing detector**: paste a URL, an email, or scan a
QR code → it returns a **risk verdict (Safe / Suspicious / Threat)** with a
confidence score and a list of reasons.

- It combines **machine learning models** + **hand-written rule heuristics**.
- Everything runs locally or on free/cloud services — no paid APIs.
- Front-end is a static terminal-style web UI; back-end is a Python API.

---

## 2. Tech stack

### Backend — Python + Flask
- **Language:** Python 3.14.x
- **Web framework:** Flask 3.1.3 (JSON API, port **3000**, loopback only)
- **CORS:** flask-cors (lets the static frontend call the API cross-origin)
- **HTTP client:** requests (page fetch, LanguageTool, redirects)
- **DNS:** dnspython (feature extraction, SPF/DMARC/DKIM, DNSBL checks)
- **WHOIS:** python-whois (domain-age enrichment)
- **Spell check:** pyspellchecker (email grammar analysis)
- **Database driver:** pymongo (accounts, scan history, reports, points, leaderboard)
- **Config:** python-dotenv (loads `MONGO_URI` from `backend/.env`)
- **Passwords:** werkzeug.security (`generate_password_hash` / `check_password_hash`)
- **Auth tokens:** custom bearer token via stdlib `secrets.token_hex(32)` stored in MongoDB (NOT JWT — despite the "Bearer" header name)
- **Concurrency:** stdlib `concurrent.futures` thread pools + a thread-safe TTL cache

### Frontend — pure HTML/CSS/JS (no build step)
- **No npm / Node / bundler** — files are served as-is.
- **Dev server:** `frontend/serve.py` (Python stdlib `http.server`, port **8000**, no-cache headers)
- **Structure:** multiple pages (`index.html` scanner, `auth.html`, `dashboard.html`, `minigames.html`, `help.html`) + one CSS folder + one JS folder.
- **Architecture pattern:** "managers" — each JS file is a self-contained module (Theme, Scanner, Profile, Minigames, etc.), all booted by `app.js` which routes per page.
- **CDN libraries only:**
  - jsQR 1.4.0 — decodes QR codes in the browser
  - Font Awesome 6.5.1 — icons
  - Google Fonts — Inter + JetBrains Mono

### Machine learning — scikit-learn + joblib
- **joblib** — save/load trained `.joblib` model files
- **pandas / numpy** — feature tables, data frames
- **scikit-learn 1.9.0** — all estimators (RandomForest, LogisticRegression, TfidfVectorizer, CalibratedClassifierCV)
- **Trained artifacts** (generated, git-ignored):
  - `phishing_model.joblib` (~403 MB) — main URL-feature model
  - `url_text_model.joblib` (~6.4 MB) — URL-string word model
  - `email_text_model.joblib` (~4.7 MB) — email-body word model

### Storage & infrastructure
- **Database:** MongoDB Atlas (cloud), database name `phisdetect`
- **Collections:** `users`, `scans` (scan history), `reports` (threat reports), `minigame_scores`, `user_stats`
- **Backend without MongoDB:** scanner still works; only accounts/leaderboard/dashboard return errors.

---

## 3. Datasets & data sources

### Main phishing model (URL features)
- `model/trained/dataset_small.csv` — 58,645 rows (30,647 phish / 27,998 benign); base set from early dev; has 8 legacy feature columns that are dropped.
- `model/trained/dataset_augmented.csv` — 61,705 rows = base + **3,060 generated benign URLs** (built by `augment_dataset.py`).
- Augmentation recipe: 612 real domains sampled from **Tranco top 1M** (+ 18 hardcoded popular domains) × **5 URLs each**, using 20 realistic path templates and 9 subdomain prefixes.

### Email model
- **Phishing examples:** 4 mbox files of real phishing emails (`phishing0–3.mbox`) from Jose Nazario's corpus.
- **Benign examples:** SpamAssassin **easy_ham** corpus (2002 public corpus, `.tar.bz2`); **Enron** email dataset as a secondary/fallback source.
- **Modern/synthetic additions:** `update_email_data.py` generates **4,000 synthetic phishing + 4,000 synthetic benign** emails (brand impersonations, sign-in reviews, invoices, packages, crypto — modern shapes).
- **Output:** `model/data/email_text_dataset.jsonl` — 12,374 rows, perfectly balanced (6,187 phish / 6,187 benign), JSON-lines, label 1 = phish / 0 = benign.

### URL text model
- **Phishing:** live feeds — **OpenPhish** (`openphish.com/feed.txt`) and **Phishing.Database** (mitchellkrogza/phishing-domains-ACTIVE.txt), capped ~150k.
- **Benign:** sampled from **Tranco top 1M** (top 5,000 guaranteed + random tail).
- Training happens with a 80/20 train/test split (seeded).

### Runtime lists (used live, not for training)
- `model/lists/tranco_top1m.txt` / `tranco_top100k.txt` — the trusted **allowlist** (top visited sites).
- `model/lists/openphish_hosts.txt` — the known-phishing **blocklist**.
- `model/lookup/shorteners.txt` — known URL shorteners (bit.ly, t.co, ...).
- `model/lookup/tlds.txt` — every top-level domain, for TLD counting.
- **Refresh scripts:** `update_lists.py` re-downloads Tranco (zip) + OpenPhish feed.

### Live services consulted at scan time
- **DNS** (system resolvers) — IP, NS, MX, TXT/SPF lookups
- **DNSBLs** — `multi.surbl.org`, `dbl.spamhaus.org` (email/URL blacklists)
- **WHOIS servers** (port 43) — domain creation date for domain age
- **LanguageTool** (`api.languagetool.org/v2/check`) — grammar/manipulation analysis for emails
- **The scanned target itself** — HTTP fetch + redirect detection

---

## 4. Methodologies

### How a URL scan works (backend pipeline)
1. Parse URL → run **`extract_features.py`** → **103 hand-crafted features**.
2. **Main ML model** scores the features → phishing probability.
3. **URL text model** scores the cleaned URL string → second probability.
4. **Heuristic risk**: cheap TLDs, suspicious keywords, brand-spoof tricks, IDN tricks, allowlist gate, blocklist.
5. **Enrichment** (parallel, time-boxed): domain age (WHOIS), SSL/TLS validity, redirect detection, DNSBL blacklist.
6. **Page scan** (optional): fetch the page and look for credential-harvesting signals (password/SSN/CVV fields).
7. Probabilities are merged → **confidence %** → **verdict** + readable reasons.

### How an email scan works
1. Parse raw email → subject + body (HTML stripped).
2. Extract links (regex), count attachments, detect From/Reply-To **spoofing**.
3. **Sender authentication probes** via DNS: SPF / DMARC / DKIM.
4. **Grammar & manipulation analysis**: LanguageTool API + spell-checker; urgency-phrase detection.
5. **Link-text mismatch** detection (link says PayPal, destination is .xyz).
6. **Email text model** scores the cleaned body → probability.
7. Combine with heuristics → confidence + verdict + reasons.

### The three machine-learning models
- **Model 1 — Main (URL features):** RandomForestClassifier (100 trees) wrapped in `CalibratedClassifierCV(method="isotonic", cv=5)` for well-calibrated probabilities.
  - Input: 103 numeric features. Trained on `dataset_augmented.csv`.
- **Model 2 — URL text:** cleaned URL string → custom tokenizer (words + character 3/4/5-grams) → `TfidfVectorizer` (sublinear_tf, min_df=2, max_features=150k) → `LogisticRegression` (solver liblinear, class_weight balanced).
- **Model 3 — Email text:** cleaned email (subject + body, URLs/emails/numbers replaced with tokens) → `TfidfVectorizer` (word 1-2 grams) → `LogisticRegression` in a scikit-learn Pipeline.

### Validation protocol (how we know the models work)
- **5-fold stratified cross-validation** (main model).
- **80/20 train/test split** (URL text + email text models).
- Metrics reported: **accuracy**, **precision/recall/F1**, **confusion matrix**, **Brier score** (probability quality), and **calibration bins**.
- No single "final accuracy" is printed in the docs — the numbers come from running `train.py`; re-run it to quote fresh results.

### Scoring & verdicts
- Probabilities are combined and capped; reasons are collected into a human-readable report.
- Verdicts are colour-coded (green/yellow/red): **Safe / Suspicious / Threat**.
- All live network calls have **timeouts** and **fail-soft** (neutral defaults), so scans don't hang offline.

### Accounts, points & leaderboard
- Sign up / log in with email + password (hashed with werkzeug).
- Logged-in scans & **threat reports** give points (reports × 10 + minigame points).
- Minigames: **Phish or Legit**, **Link Dismantler**, **Threat Hunt** — scores go to MongoDB.
- Leaderboard shows top players (anonymous guests get local browser profiles).

---

## 5. Key concepts to research

### Phishing & email security
- Phishing, spear phishing, social engineering
- Lookalike domains / typosquatting / brand spoofing / subdomain tricks
- IDN / punycode attacks, URL shorteners
- SPF, DMARC, DKIM — what each does
- From / Reply-To spoofing, urgency & manipulation tactics
- Why a "free $ prize / verify your account" email is a scam

### Networking & web
- URL anatomy: scheme, host, path, query, fragment
- DNS record types: A, NS, MX, TXT (SPF), CNAME
- TLS / SSL certificates, and what "invalid" means
- WHOIS and domain age
- DNSBL / RBL blacklists
- HTTP redirects (301/302) and why phishers use them

### Machine learning
- TF-IDF, n-grams / character n-grams, tokenization
- Random Forest (ensemble of decision trees)
- Logistic Regression, class imbalance + `class_weight`
- Probability calibration (isotonic), Brier score
- Cross-validation vs train/test split, precision vs recall vs F1
- Feature engineering (hand-crafted features), overfitting

### Web & app architecture
- Client-server model, REST-style JSON APIs
- CORS, bearer tokens, localStorage vs cookies
- MVC-ish "manager" pattern in the frontend

---

## 6. References

### 1) Read the in-project docs FIRST (deep dives)
- `README.md` — product overview
- `intel/structure.md` — every file explained
- `intel/requirements.md` — every dependency + live service
- `intel/backendlogic.md` — the full scan pipeline + all API endpoints
- `intel/model.md` — the three models in depth
- `intel/installguide.md` — how to run everything

### 2) Datasets
- SpamAssassin public corpus (easy_ham, etc.) — https://spamassassin.apache.org/old/publiccorpus/
- Jose Nazario phishing corpus (phishing0–3.mbox) — https://monkey.org/~jose/phishing/
- Enron email dataset (CMU) — https://www.cs.cmu.edu/~enron/
- OpenPhish feed — https://openphish.com/feed.txt
- Phishing.Database (mitchellkrogza) — https://github.com/mitchellkrogza/Phishing.Database
- Tranco list — https://tranco-list.eu/

### 3) Tools, libraries & APIs
- Flask — https://flask.palletsprojects.com/
- scikit-learn — https://scikit-learn.org/
- MongoDB Atlas — https://www.mongodb.com/atlas
- LanguageTool API — https://api.languagetool.org/
- Spamhaus (DNSBL) — https://www.spamhaus.org/
- SURBL (DNSBL) — https://www.surbl.org/
- jsQR — https://github.com/cozmo/jsQR
- Font Awesome — https://fontawesome.com/
- Google Fonts (Inter, JetBrains Mono) — https://fonts.google.com/

### 4) Background reading (optional but impressive)
- OWASP phishing / security awareness pages (https://owasp.org/)
- Cloudflare / APWG phishing explainers
- scikit-learn user guide chapters: feature extraction, ensembles, model calibration
- Google "Phishing Quiz" for real-world examples of scam email tell-tales