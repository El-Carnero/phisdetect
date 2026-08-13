# Installing PhisDetect on Your Computer

**PhisDetect** is a tool that checks things for you:
- a **web address (URL)**, or
- the **text of an email**,

…and tells you how likely it is to be a **phishing attack** — a fake website or
scam email that is trying to trick you. Like a "danger detector" for links.

By the end of this guide you will have:

1. The PhisDetect **code** on your computer.
2. The **"brains"** (the trained AI models) built on your machine.
3. The app **running** in your web browser, ready to scan.

> **Time needed:** about 30–60 minutes the first time. The slow part is Step 4,
> where your computer "learns" the model.

---

## 0. What you need before you start

| You need | Why | Notes |
|----------|-----|-------|
| A computer | To run the app | Any Windows, Mac or Linux computer |
| Internet | To download the code and packages, and later to let the scanner check live services | The scanner works offline too, but not as well |
| **Python** (version **3.14**) | Python is the "language" the code is written in | It's free — see below |
| Git (optional) | Only if you want to download the code the "update-friendly" way | You can skip it and use a ZIP file instead |

### What is a "terminal"?

A **terminal** (called **Command Prompt** on Windows) is a black (or dark)
window where you type commands and press **Enter**. You will do most of this
guide in one, and it's easier than it sounds.

- **Windows:** press the Windows key, type `cmd`, and press Enter.
- **Mac:** press Cmd+Space, type `Terminal`, and press Enter.
- **Linux:** most versions open one with Ctrl+Alt+T.

### Check if Python is installed

Open a terminal and type:

```
python --version
```

(On Mac or Linux, try `python3 --version` if the above does nothing.)

PhisDetect needs **Python 3.14** — so you should see something like
`Python 3.14.6`.

- **If you see `Python 3.14`** — great, move on.
- **If the command is not found, or shows a different version** — install
  Python 3.14 from <https://www.python.org/downloads/>. On Windows, **tick the
  box that says "Add Python to PATH"** during installation (very important!),
  then close and reopen your terminal.

> Other versions of Python are not officially supported. Install the newest
> **3.14** release.

---

## 1. Get the code from GitHub

The code lives at **<https://github.com/El-Carnero/phisdetect>**. There are
two ways to get it — pick whichever is easier for you.

### Option A — Download a ZIP (easiest)

1. Open <https://github.com/El-Carnero/phisdetect> in your browser.
2. Click the green **"Code"** button, then click **"Download ZIP"**.
3. Wait for the download to finish. It's a bit big (it includes the training
   data), so it may take a few minutes.
4. Find the downloaded file and **unzip** it. On Windows, right-click it →
   *Extract All*. You now have a folder called `phisdetect-main`.

   > You can rename that folder to just `phisdetect` so it matches this guide.
   > On Mac or Linux, type `mv phisdetect-main phisdetect` in the terminal
   > (from the folder where you unzipped it).

### Option B — Clone with Git (best for updates later)

If you have Git installed, open a terminal and type:

```
git clone https://github.com/El-Carnero/phisdetect.git
```

This creates a folder called `phisdetect`.

### Get a terminal "inside" your project folder

From now on, every command must be run **inside the `phisdetect` folder**. Here
is how to get a terminal pointing at it:

- **Windows:** open the `phisdetect` folder in File Explorer, click the
  address bar at the top (where it shows the folder name), type `cmd`, and
  press **Enter**. A command prompt opens inside the folder.
- **Mac:** open the folder in Finder. Then in Terminal, type `cd ` (that's
  "cd" + a space), drag the `phisdetect` folder onto the terminal window, and
  press **Enter**.
- **Linux:** open the folder in your file manager, right-click the empty area,
  and choose **"Open in Terminal"**.

> **Important:** the download contains the code, the lists and the training
> data — but **not** the three big model files. They are too big for GitHub
> (the main one is about 400 MB; GitHub only allows 100 MB per file). You will
> build them yourself in Step 4. This is completely normal.

---

## 2. Create a private "workspace" for Python (a virtual environment)

Python packages are like the building blocks your program needs. A **virtual
environment** is a private box that holds them, so they don't get mixed up with
other things on your computer. Think of it as a separate toolbox just for
PhisDetect.

**Type this inside your `phisdetect` folder:**

- **Windows:**
  ```
  python -m venv model\venv
  ```
- **Mac / Linux:**
  ```
  python3 -m venv model/venv
  ```

> If that gives an error, try `py -m venv model\venv` (Windows) or
> `python3.14 -m venv model/venv` (Mac/Linux).

This makes a new folder called `venv` inside the `model` folder. Now you have
to **turn it on** ("activate" it). You must do this in **every terminal** you
use for PhisDetect:

- **Windows (Command Prompt):**
  ```
  model\venv\Scripts\activate
  ```
- **Mac / Linux:**
  ```
  source model/venv/bin/activate
  ```

When it works, you will see **`(venv)`** at the start of the line, like this:

```
(venv) C:\Users\you\phisdetect>
```

Let's double-check everything is fine:

```
python --version
python -m pip --version
```

Both should answer (e.g. `Python 3.14.x` and a `pip ...` line). If they do,
**keep this terminal open** — you'll use it for the next steps.

---

## 3. Install the pieces PhisDetect needs

Still with `(venv)` showing, type:

```
python -m pip install -r model/requirements.txt
```

This downloads and installs the **11 packages** PhisDetect needs (Flask, pandas,
scikit-learn, and friends — see [`requirements.md`](requirements.md) for the
full list). It usually takes 2–5 minutes.

When it finishes, you should see a message containing the words
`Successfully installed` (followed by names like `Flask-3.1.3 ...`).

> If you get a "not found" or "is not recognized" error about `python` or
> `pip`, the virtual environment is not active — check that `(venv)` is at the
> start of your line.

---

## 4. Build the "brains" (the models) — the slow step

The smart part of PhisDetect is a **model**: a pattern-finder that has been
"trained" to spot phishing. The finished models are too big for GitHub, so you
will build them on your computer from the training data that *is* included in
the download.

Run these three commands **one at a time** (wait for each to finish before
starting the next). Keep `(venv)` active:

```
python model/src/train.py
python model/src/train_url_text_model.py
python model/src/train_email_text_model.py
```

What each one does:

| Command | What it builds | Internet needed? | How long |
|---------|----------------|------------------|----------|
| `python model/src/train.py` | The **main** model (the most important one) | No — the data came with the download | **10–40 minutes** (the slow one!) |
| `python model/src/train_url_text_model.py` | The "looks at the URL wording" model | **Yes** — it first downloads a fresh list of known phishing sites | A few minutes |
| `python model/src/train_email_text_model.py` | The "looks at the email wording" model | No — the data came with the download | A couple of minutes |

You'll know the main one finished when it prints:

```
Saved calibrated phishing_model.joblib + features.txt
```

The finished models appear in the `model/trained/` folder.

### "I ran the URL-text one and it failed!"

Don't worry. That model only downloads if you're online. If it can't, the
server will still start — that one feature is just skipped. **The main model
(`train.py`) is the only one that MUST finish**, otherwise the server won't
start. So if in doubt, make sure that one succeeded.

### Optional: refresh the lists of known websites

PhisDetect uses two lists: the top 1 million trusted websites, and a list of
known phishing sites. The included copies work fine. If you ever want to update
them (needs internet):

```
python model/src/update_lists.py
```

---

## 5. Set up the database (optional — you can skip this!)

PhisDetect can save **accounts**, **scan history** and **leaderboard scores**
to a database. **You don't need it for scanning** — the scanner works without
it. Only do this if you want those "save" features.

If you have a MongoDB database (for example a free MongoDB Atlas cluster):

1. In the `backend` folder, create a new file called **`.env`** (with no other
   name).
2. Put exactly one line in it, replacing the parts in `<...>` with your own:

   ```
   MONGO_URI=mongodb+srv://<your-user-name>:<your-password>@<your-cluster>/?retryWrites=true&w=majority
   ```

3. Save the file.

> **If you skip this step** (no `.env` file), that's totally fine. When the
> server starts, it prints a message like
> `[MongoDB] WARNING: could not reach database`. **That message is normal and
> harmless** — just ignore it. Everything except saving accounts/scores still
> works.

---

## 6. Start the scanner (the "backend")

With `(venv)` active, type:

```
python backend/server.py
```

A bunch of messages will appear. Give it a moment to load the big model. At the
end you should see:

```
 * Running on http://127.0.0.1:3000 (Press CTRL+C to quit)
```

> **Do not close this terminal window.** The scanner must keep running while
> you use the app. (To stop it later, press **Ctrl+C** in that window.)

Let's prove it's alive. Open your web browser and go to:

```
http://localhost:3000/api/minigame/leaderboard
```

You should see a page of text with curly braces, like `{"leaderboard": {...}}`.
If you see that, the scanner is healthy!

> The address `127.0.0.1` (or `localhost`) means "this same computer" — the
> scanner only listens on your own machine, so nobody else can reach it.

---

## 7. Open the website (the "frontend")

The app's pretty web page is served by a tiny second helper. Open a **second**
terminal window, go inside your `phisdetect` folder again, and **activate the
venv again** (same commands as Step 2), then run:

```
python frontend/serve.py
```

You'll see:

```
PhisDetect frontend running at http://localhost:8000 (caching disabled)
```

Now open your browser and go to:

```
http://localhost:8000
```

You should see the PhisDetect home page. **Keep both terminals running** — the
one on port 3000 (scanner) and the one on port 8000 (website).

> **Why two windows?** The scanner (port 3000) does the thinking. The website
> (port 8000) is the face you look at. The website talks to the scanner
> automatically, so keep both on the same computer.

---

## 8. How to use it

### Scan a URL

1. On the home page, find the **URL scanner** box.
2. Paste a web address you are allowed to test. A safe first try is
   `https://example.com` — a special "test" domain that should come back
   **Safe**.
3. Want to see a suspicious result without ever touching a real scam site? Try
   `http://paypal-account.verify-now.invalid/login` — `.invalid` is a reserved
   test suffix, so no real website hides behind it.
4. Click **Scan** and wait a few seconds. The first scan is always the slowest.
5. You get a verdict:

   | Verdict | What it means |
   |---------|---------------|
   | **Safe** | Looks fine |
   | **Suspicious** | Some warning signs — double-check before using it |
   | **Threat** | Strong signs of phishing — do **not** type anything in |
   | **Critical** | Almost certainly phishing — treat as dangerous |

   Below the verdict, the app lists the reasons (a look-alike domain, a very
   new domain, an IP address instead of a name, a suspicious keyword, and so
   on).

### Scan a QR code (with your camera)

1. Open the **QR Scanner** page.
2. Upload a picture of a QR code from your device.
3. Click **Scan** once the URL is extracted.

### Scan an email

1. Open the **Email Scanner** page.
2. Paste the email's **subject and body text** into the box (the text, not the
   file).
3. Click **Scan**. The tool checks the wording, the links inside, sender
   authentication hints and grammar.

### Other pages

- **Dashboard** — a summary of your recent scans.
- **Profile** — your settings and history.
- **Minigames** — fun games (Spot the Phish, Link Dismantler, Threat Hunt)
  with a leaderboard.

### A note about the internet

For the most accurate results, the scanner checks live services while it works:
DNS lookups, blacklists, WHOIS (how old is the domain), and a grammar service.
If your computer is offline, those checks are skipped and it falls back to
weaker "guessing-only" detection — it still works, just less precisely.

> **Be responsible:** this is a security tool. Only scan addresses and emails
> you are allowed to inspect.

---

## 9. If something goes wrong

| What happened | Likely reason | How to fix it |
|---------------|---------------|---------------|
| `'python' is not recognized` or `command not found` | Python isn't installed or isn't in PATH | Install Python 3.14 (tick "Add Python to PATH" on Windows), reopen the terminal |
| `(venv)` is missing from the prompt | The workspace isn't switched on | Run the activation command from Step 2 |
| `python -m pip install` fails | Wrong Python version, or a package hiccup | Make sure you have Python 3.14, then retry `python -m pip install -r model/requirements.txt` |
| The server stops with a message about `phishing_model.joblib` | You skipped or stopped Step 4's first command | Run `python model/src/train.py` and wait for the "Saved" message |
| `url_text_model.joblib` wasn't created | That model needs internet | Re-run `python model/src/train_url_text_model.py` online, or just continue without it |
| I see `[MongoDB] WARNING: could not reach database` | You didn't set up the database (Step 5) | That's fine — ignore it. The scanner still works |
| `http://localhost:3000/...` won't load | The scanner isn't running | Check the Step 6 terminal for the `Running on http://127.0.0.1:3000` line |
| The website says the scanner is unreachable | The scanner stopped, or you're on different computers | Restart `python backend/server.py`; both windows must run on this computer |
| "Port 3000 / 8000 already in use" | Another program is using that number | Close the other program, or use a different port for the website: `python frontend/serve.py` with `PORT=9000` set, and open `http://localhost:9000` |
| The camera won't start for QR | Permission blocked, or no camera | Click the camera icon in the address bar and allow it, or paste the URL instead |
| The first scan feels very slow | DNS and WHOIS lookups take a few seconds | Be patient — later scans are faster |
| Something says "X is missing" | A needed file was deleted | Don't delete `model/requirements.txt`, `model/trained/features.txt`, or anything in `model/trained/` after training |

---

## 10. Updating to a newer version

- If you **cloned** with Git: go into the `phisdetect` folder and run
  `git pull`.
- If you used the **ZIP**: download the new ZIP and unzip it **over** the old
  files.

Your trained models and your workspace are not stored in Git, so an update
won't delete them — you normally do **not** need to retrain. You might need to
run the install command again if new packages were added:

```
python -m pip install -r model/requirements.txt
```

---

## 11. Starting PhisDetect later

You don't have to redo everything next time — just these bits. Open **two**
terminals in the `phisdetect` folder.

**Terminal 1 (the scanner):**

```
source model/venv/bin/activate            # Windows: model\venv\Scripts\activate
python backend/server.py
```

**Terminal 2 (the website):**

```
source model/venv/bin/activate            # Windows: model\venv\Scripts\activate
python frontend/serve.py
```

Then open **http://localhost:8000** in your browser.

---

## 12. Quick reference (every command in one place)

One-time setup:

```
python -m venv model\venv                      # Windows
python3 -m venv model/venv                     # Mac / Linux

model\venv\Scripts\activate                    # Windows (do in every terminal)
source model/venv/bin/activate                 # Mac / Linux (do in every terminal)

python -m pip install -r model/requirements.txt

python model/src/train.py                      # 10–40 minutes — be patient!
python model/src/train_url_text_model.py
python model/src/train_email_text_model.py
```

Every time you use it (two terminals, then open http://localhost:8000):

```
python backend/server.py                       # terminal 1 — keep running
python frontend/serve.py                       # terminal 2 — keep running
```

---

That's it — you're done! Try scanning `https://example.com` first, and then
the `.invalid` test address from Step 8. Happy (and safe) browsing.
