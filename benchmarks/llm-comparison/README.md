# COMPASS vs Medical LLM Benchmark

A portable, reproducible benchmark harness that runs the same 600 diagnostic
stress-test cases against multiple providers and produces directly comparable
accuracy / latency reports.

## Supported providers

| Provider | Description | Runtime |
|---|---|---|
| `compass` | COMPASS Bayesian diagnostic engine (this repo) | ~35 min |
| `biomistral` | BioMistral-7B (PubMed Central fine-tuned) | GPU ~40 min / CPU 3+ hrs |
| `meditron` | Meditron-7B (EPFL, clinical guidelines) | GPU ~40 min / CPU 3+ hrs |
| `llama3` | Llama-3.1-8B (general-purpose control) | GPU ~40 min / CPU 3+ hrs |

All LLMs are served locally via **Ollama** — no API keys, no data leaves the machine.

---

## Prerequisites

- **Node.js 18+** — https://nodejs.org
- **Ollama** — https://ollama.com/download (any OS)
- ~50 GB disk space (three 7-8B models @ ~14 GB each)
- For reasonable LLM runtime: **8GB+ GPU** (Apple Silicon, NVIDIA, or AMD)

Optional (for running COMPASS itself):
- Clone of this repo with dev branch checked out
- `npm install` from repo root (monorepo)

---

## Quick start

```bash
# 1. Clone and checkout dev
git clone git@github.com:La6kers/ATTENDING.git
cd ATTENDING
git checkout dev

# 2. Run setup (from this directory)
cd benchmarks/llm-comparison
bash setup.sh              # Linux/macOS
# OR
./setup.ps1                # Windows PowerShell

# 3. Start the COMPASS dev server (in a separate terminal, from repo root)
cd ../..
npm install
npm run --workspace=compass-standalone dev      # listens on :3005

# 4. Back in the benchmark terminal — run a quick sanity test
cd benchmarks/llm-comparison
node run-benchmark.mjs --provider compass --limit 5

# 5. Full runs (pick any provider or all four)
node run-benchmark.mjs --provider compass
node run-benchmark.mjs --provider biomistral
node run-benchmark.mjs --provider meditron
node run-benchmark.mjs --provider llama3

# 6. Side-by-side comparison report
node run-benchmark.mjs --compare compass,biomistral,meditron,llama3
```

---

## CLI reference

### Single-provider run

```
node run-benchmark.mjs --provider <name> [options]
```

| Flag | Default | Description |
|---|---|---|
| `--provider` | — | `compass` \| `biomistral` \| `meditron` \| `llama3` |
| `--limit N` | all 600 | Run first N cases only |
| `--compass-url` | `http://localhost:3005` | Override COMPASS endpoint |
| `--ollama-url` | `http://localhost:11434` | Override Ollama endpoint |
| `--output-dir` | `./results` | Where to write report files |
| `--label` | — | Suffix appended to output filenames |

**Writes:** `results/<provider>-<timestamp>[.md|.json]`

### Comparison

```
node run-benchmark.mjs --compare compass,biomistral,meditron,llama3
```

Reads the **most recent** JSON result for each named provider in `./results/`
and generates `results/comparison-<timestamp>.md` with:
- Summary table (top-1/top-3/top-5 accuracy, latency percentiles)
- Per-condition accuracy heatmap
- Specific cases where providers disagreed

---

## How it works

1. **`extract-cases.mjs`** (run once) reads `COMMON_CONDITIONS` and `RARE_CONDITIONS`
   from the canonical test file (`tmp-compass-test/run-tests-v20-600api.mjs`) and
   produces a deterministic 600-case `cases.json` (default seed 42).

2. **`run-benchmark.mjs`** iterates the 600 cases, dispatches each to the chosen
   provider, grades the output using `match-aliases.json`, and writes reports.

3. **Providers:**
   - `providers/compass.mjs` — POSTs to `/api/diagnose` (respects 3.5s rate limit)
   - `providers/ollama.mjs` — generic Ollama client; uses a standardized clinical
     prompt; parses numbered-list responses into a comparable format

4. **Grading** — same `isHit()` logic as the COMPASS stress test, checking
   top-1, top-3, and top-5 for direct-name match or synonym match
   (e.g., "MI" matches "Acute Myocardial Infarction").

---

## Model tags (edit in `providers/ollama.mjs` if needed)

The default tags point to the most reliable community uploads on Ollama:

| Provider | Tag | Notes |
|---|---|---|
| `biomistral` | `cniongolo/biomistral` | Alternative: `alibayram/biomistral` |
| `meditron` | `meditron` | EPFL release |
| `llama3` | `llama3.1:8b` | Official Meta release |

---

## Troubleshooting

### "Cases file not found"
Run `node extract-cases.mjs` once (or `bash setup.sh` which does it).

### "fetch failed" for COMPASS
Is the COMPASS dev server running? Try:
```
curl http://localhost:3005/api/diagnose -X POST -H "Content-Type: application/json" -d '{"chiefComplaint":"test","age":30}'
```

### "fetch failed" for Ollama
Is ollama running?
```
curl http://localhost:11434/api/tags
# If 404 or connection refused:
ollama serve &
```

### Model pull failing
Check if the tag exists: `ollama list` and `ollama show <model>`. Try alternate tags (see section above).

### LLM runs too slow
- First run of any model loads weights into VRAM (~30s)
- On CPU, 7B models take 15-30s per case — expect 2-4 hrs for 600 cases
- Reduce scope: `--limit 100` for a 100-case subset
- Check `ollama ps` to confirm model is GPU-loaded (should show `100% GPU`)

### Different seed / custom dataset
```
node extract-cases.mjs --seed 123
```
Regenerates `cases.json` with different case order. All providers must use the
same `cases.json` for apples-to-apples comparison.

---

## Report interpretation

Each individual provider report contains:

- **Accuracy**: top-1 / top-3 / top-5 hit rates
- **Latency**: p50 / p95 / p99 in ms
- **Per-condition table**: hits/total for every expected diagnosis, sorted by worst top-3
- **Misses table**: every case where the expected dx was NOT in the top-3

The comparison report adds:

- **Side-by-side summary** — quick-scan comparison of key metrics
- **Heatmap** — every condition × every provider showing top-3 accuracy
- **Disagreement cases** — up to 200 specific CCs where at least one provider
  missed top-3, showing each provider's top-3 for direct inspection

---

## Reproducing results on another machine

Because `cases.json` is checked into git with a fixed seed, any two machines
running the same commit will use identical test inputs. Providers that are
deterministic (COMPASS) will produce identical results. LLM providers will
produce similar but not byte-identical results (due to temperature=0.2 variance).

---

## License / ethics

- This benchmark uses synthetic layman-language patient presentations.
- **No PHI** is involved.
- BioMistral/Meditron/Llama3 run entirely locally; no data egress.
- Results should be considered research-grade — not a clinical validation
  study. Intended for engineering comparison only.
