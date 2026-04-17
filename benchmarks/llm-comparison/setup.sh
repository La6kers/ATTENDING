#!/usr/bin/env bash
# ============================================================
# COMPASS vs LLM Benchmark — Linux/macOS setup script
# ============================================================
set -euo pipefail

echo ""
echo "COMPASS vs Medical LLM Benchmark — setup"
echo "========================================="
echo ""

# 1. Check node
if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js not found. Install from https://nodejs.org (v18+)"
  exit 1
fi
NODE_VER=$(node -v)
echo "✓ Node.js $NODE_VER"

# 2. Check ollama
if ! command -v ollama >/dev/null 2>&1; then
  echo ""
  echo "ollama not found. Install:"
  echo "  macOS:  brew install ollama"
  echo "  Linux:  curl -fsSL https://ollama.com/install.sh | sh"
  echo ""
  read -r -p "Continue without ollama? (COMPASS-only benchmarks possible) [y/N]: " ans
  [[ "$ans" =~ ^[Yy] ]] || exit 1
else
  echo "✓ ollama found"

  # Ensure ollama daemon is running
  if ! curl -sSf http://localhost:11434/api/tags >/dev/null 2>&1; then
    echo "Starting ollama daemon..."
    ollama serve >/dev/null 2>&1 &
    sleep 3
  fi

  # Pull models
  echo ""
  echo "Pulling medical LLMs (~14 GB each)..."
  for model in "cniongolo/biomistral" "meditron" "llama3.1:8b"; do
    echo ""
    echo "→ ollama pull $model"
    ollama pull "$model" || echo "WARN: failed to pull $model, continuing..."
  done
fi

# 3. Extract cases if not already done
cd "$(dirname "$0")"
if [ ! -f "cases.json" ]; then
  echo ""
  echo "Extracting 600 test cases..."
  node extract-cases.mjs
fi

# 4. Make results dir
mkdir -p results
touch results/.gitkeep

echo ""
echo "========================================="
echo "Setup complete."
echo ""
echo "Next steps:"
echo "  # Start COMPASS dev server in another terminal (from repo root):"
echo "    npm install"
echo "    npm run --workspace=compass-standalone dev"
echo ""
echo "  # Quick sanity test (5 cases, ~20 sec):"
echo "    node run-benchmark.mjs --provider compass --limit 5"
echo ""
echo "  # Full run per provider (600 cases each):"
echo "    node run-benchmark.mjs --provider compass      # ~35 min"
echo "    node run-benchmark.mjs --provider biomistral   # ~40 min on GPU, 3+ hrs on CPU"
echo "    node run-benchmark.mjs --provider meditron     # ~40 min on GPU"
echo "    node run-benchmark.mjs --provider llama3       # ~40 min on GPU"
echo ""
echo "  # Compare all four:"
echo "    node run-benchmark.mjs --compare compass,biomistral,meditron,llama3"
echo ""
