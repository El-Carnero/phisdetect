# Orange Data Mining — PhisDetect Visualization Guide

**Role copy:** how to use the free **Orange 3** visual data-mining tool to
visualize PhisDetect's data, features, and model training — for demos, the
project video, and the vivas. Every workflow below works on the real project
files already in the repo.

> **Accuracy note:** the widget chains below were built for Orange 3.x with
> standard widgets that ship with the core tool. Screen shots you produce are
> *representative* demonstrations of the same logic as the shipped models — not
> byte-for-byte reproductions of the `.joblib` artifacts (see §7, "gotchas").

---

## 1. Quick verdict — what's possible

| Project file | Can Orange use it? | Best used for |
|--------------|--------------------|----------------|
| `model/trained/dataset_augmented.csv` (61,705 rows, 103 features + `phishing`) | ✅ Yes, direct CSV import | Most visualizations (features, ranking, clustering, training demo) |
| `model/trained/dataset_small.csv` (58,645 rows) | ✅ Yes | Same as above; simpler base set |
| `model/trained/features.txt` (the 103 names in order) | ✅ Yes (as reference) | Mapping feature names to columns during demos |
| `model/data/email_text_dataset.jsonl` | ⚠️ Convert to CSV first | Email-text distributions (see §5.9) |
| `model/trained/*.joblib` (the trained models) | ⚠️ Only via the **Python Script** widget (§5.8) | Honest check of the *real* models |
| Live app behaviour (Flask API, QR, DNS, page fetch) | ❌ No | Keep as a live demo — Orange is for data/ML, not runtime |
| Live DNS lookups at scan time | ❌ No | The 5 DNS features exist in the CSV; live DNS is a runtime concern |

---

## 2. Setup

1. **Install Orange 3** — free and open source (AGPL).
   - `pip install orange3`, then launch with `orange-canvas`
   - or download the standalone installer from https://orangedatamining.com/
2. **Nothing else to install** — Orange bundles its own scikit-learn backend, so
   learners run out of the box.
3. **Warm up the data:**
   - `dataset_augmented.csv` is ready to drag into Orange as-is.
   - For heavy widgets (t-SNE) on 61k rows, use the **Data Sampler** widget first
     (e.g. sample 2,000–5,000 rows) — see §5.4.

---

## 3. The master workflow map

```
 dataset_augmented.csv
        │
        ▼
      File ───────────────► Select Columns ──► (target = "phishing")
        │                                          │
        ├──► Box Plot / Distributions   (per-feature separation)
        ├──► Rank                        (feature importance, visual)
        ├──► Data Sampler ──► t-SNE      (class clustering)
        ├──► Scatter Plot / Mosaic       (pairwise relationships)
        │
        └──► Test & Score ──► Confusion Matrix
                    │         ├─► ROC Analysis
                    │         └─► Lift Curve
                    │
        └──► Python Script ──► load real .joblib ──► Distributions / calibration table
```

---

## 4. Start here — the label sanity check

**What you'll see:** how balanced the dataset is (phish 30,647 / benign 31,058),
and that the `phishing` column is read as a proper target.

**How:**
1. Connect `dataset_augmented.csv` to a **File** widget.
2. File → **Distributions** widget; pick variable `phishing`.
3. In File widget gear, make sure `phishing` is set as the **target (class)**;
   the 103 features should be read as numeric features.

**The story it tells:** "our training set is balanced — 31k each — so the model
can't cheat by always predicting the majority class."

---

## 5. The visualization catalogue

### 5.1 Per-feature separation — Box Plot / Distributions

**What you'll see:** for a chosen feature, the value distribution of phish vs
benign side by side.

**How:** File → **Box Plot** (or **Distributions**). In the widget, set
`Split by: phishing`, then pick features one by one. Strongest 6 to feature:
- `qty_at_url` (the `@` sign)
- `qty_tld_url` (multiple top-level-domain words)
- `domain_in_ip` (raw-IP hosts — a 0/1 that will separate hard)
- `length_url` / `domain_length`
- `qty_vowels_domain` (random domains are consonant soup)
- `qty_params` / `params_length`

**The story it tells:** *visual proof* of why each heuristic/flags — the two
classes separate visibly on these features, exactly what `extract_features.py`
hand-crafts.

### 5.2 Feature importance — Rank widget

**What you'll see:** all 103 features ranked by how well they separate classes
(information gain / ANOVA / χ²…), with a bar chart.

**How:** File → **Rank** (choose e.g. Information Gain). Compare the top ~10 to
the top-15 list printed by `model/src/train.py`
(`model.calibrated_classifiers_[0].estimator.feature_importances_`).

**The story it tells:** "independent re-ranking agrees with our trained model on
the important features" — a strong research cross-check.

### 5.3 Pairwise relationships — Scatter Plot / Mosaic

**How:** File → **Scatter Plot**; set colour = `phishing`, X/Y = any two
features (e.g. `length_url` vs `qty_dot_url`). For the binary flag features
(`domain_in_ip`, `email_in_url`, `url_shortened`), use **Mosaic Display** or
**Sieve Diagram** (feature × `phishing`).

**The story it tells:** which feature pairs separate the classes, and that
single features rarely win alone — motivating *why* a model looks at all 103
together.

### 5.4 Class clustering — t-SNE

**What you'll see:** a 2-D map where phish and benign should form distinct
clouds — the classic "the data is separable" visual.

**How:** File → **Data Sampler** (e.g. Fixed proportion 5%, seed 42) → **t-SNE**
(colour = `phishing`).

**Reminder:** t-SNE on 61k rows is slow; sample first. Results are
illustrative, not a trained-model output — say so in the demo to stay honest.

**The story it tells:** "given only these numbers, phish and benign naturally
separate — which is why a model can learn to tell them apart."

### 5.5 The training & evaluation demo — Test & Score

**What you'll see:** a drag-and-drop mini reproduction of your training
pipeline: Random Forest + Logistic Regression, cross-validated, with confusion
matrix, ROC curves and lift.

**How:**
1. **File** → `dataset_augmented.csv`
2. **Select Columns** → target = `phishing`, features = the 103 (uncheck the 8
   legacy columns if you load `dataset_small.csv`).
3. **Test & Score** → add a **Random Forest** learner and a **Logistic
   Regression** learner; Sampling = *Cross validation, 5 folds*. You get
   accuracy / AUC / F1 side-by-side.
4. Attach **Confusion Matrix**, **ROC Analysis**, and **Lift Curve** to see the
   results as widgets.

**The story it tells:** "this is *how* we evaluated the models — 5-fold
cross-validation, confusion matrix, ROC." It's the same method as `train.py`,
just without code.

### 5.6 The trust question — ROC / AUC

**How:** from **Test & Score** → **ROC Analysis** widget; overlay the RF and
log-reg curves and read the AUC values.

**The story it tells:** AUC quantifies ranking quality independent of a
threshold; the higher the curve, the better the model separates classes.

### 5.7 Interpreting a model — Nomogram

**What you'll see:** for the *logistic regression*, a visual "points → risk"
scale showing how much each feature moves the risk score.

**How:** **Test & Score** (or a trained LR learner) → **Nomogram** widget.

**Note:** Nomogram works for models with `coefficients_` (logistic regression);
Random Forest is not nomogrammable — use it for the LR only.

**The story it tells:** "our ML isn't a black box — you can literally read off
how 'contains an @ sign' shifts the risk."

### 5.8 The honest one — your REAL models (Python Script widget)

**What you'll see:** the actual shipped `phishing_model.joblib` scoring real
rows, so you can compare the real model's behaviour against Orange's
representative learners.

**How:** connect your CSV into a **Python Script** widget and run something like:

```python
import joblib, pandas as pd
MODEL = "/path/to/model/trained/phishing_model.joblib"
FEATS = open("/path/to/model/trained/features.txt").read().split()

model = joblib.load(MODEL)
feats = in_data[FEATS].copy()
feats.columns = FEATS                     # enforce the exact feature order
probs = model.predict_proba(feats)[:, 1]  # class index 1 = phish

out_data = in_data.copy()
out_data["phish_prob"] = probs
```

Then connect `out` → **Distributions** (plot `phish_prob` split by `phishing`)
→ a visual proof that the real model is well-calibrated.

For an actual **reliability table**, extend the script to bin `phish_prob` and
print mean-predicted vs actual-phish-rate per bin — the same "calibration bins"
that `train.py` prints.

**Caveats:** loading a 403 MB model takes a while; do it once on a sampled
table. This is the *advanced* route — use it if you want exactness; otherwise
§5.5 suffices for the demo.

### 5.9 Email dataset (optional)

**How:** convert to CSV first — Orange reads CSV, not JSONL:

```python
import json, csv

SRC = "/path/to/model/data/email_text_dataset.jsonl"
DST = "/tmp/email_data.csv"

rows = []
for line in open(SRC, encoding="utf-8"):
    line = line.strip()
    if not line:
        continue
    r = json.loads(line)
    txt = r["text"]
    rows.append({"text": txt,
                 "label": r["label"],
                 "len_chars": len(txt),
                 "n_words": len(txt.split()),
                 "has_url": 1 if "http" in txt else 0})

with open(DST, "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=["text", "label", "len_chars",
                                      "n_words", "has_url"])
    w.writeheader()
    w.writerows(rows)
print(f"wrote {len(rows)} rows to {DST}")
```

Then load in Orange: **Distributions** / **Box Plot** on `len_chars`,
`n_words`, `has_url` split by `label`.

**Optional (advanced):** install the **Orange Text Mining** add-on to do real
text workflows (Corpus → Bag of Words → Test & Score). It's a genuinely nice
"sentence-level" demo but is outside the core tool.

---

## 6. What to capture for the report / video (for the researcher + video roles)

Add these to the demo plan:
1. `Distributions` of the label (balanced dataset proof)
2. `Box Plot` of 4–6 key features split by phish/benign (why features matter)
3. `Rank` top features (cross-check vs `train.py`)
4. `t-SNE` class clustering (separation story)
5. `Test & Score` → `Confusion Matrix` + `ROC` (evaluation story)
6. `Nomogram` (interpretability) or Python-Script real-model calibration
7. Screen-record the drag-and-drop build — it's great b-roll for Sumant's video

---

## 7. Gotchas (be accurate, don't get caught out)

- **Orange's learners ≠ your exact models.** Its Random Forest / Logistic
  Regression are separate scikit-learn instantiations and the main model's
  *isotonic calibration* is unique to this project. Call Orange output
  "representative" unless you used §5.8 with the real `.joblib`.
- **`.joblib` can't be imported directly** into File or most widgets — only via
  the **Python Script** widget, and the main model is ~403 MB (slow, RAM-heavy).
- **Live DNS features** can't be re-fetched in Orange; the CSV snapshot is fine.
- **JSONL** (`email_text_dataset.jsonl`) must be converted to CSV first.
- **t-SNE on 61k rows is slow** — always sample (Data Sampler) and note the
  result is illustrative only.
- **`dataset_small.csv` has 8 legacy columns** (asn_ip, qty_redirects, etc.) not
  in the canonical 103 — drop them in **Select Columns** if you load it.
- **Don't claim Orange proves the shipped accuracy.** It reproduces the *method
  and intuition*; only §5.8 touches the real artifacts. A demo that says "we
  checked our real model separately" always lands better than one that
  over-claims.