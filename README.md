# Nightcall

On-call agent that reproduces production bugs and verifies fixes — powered by **NVIDIA Nemotron on Nebius Token Factory**.

Feed it an alert → it reproduces the failure in a sandbox, root-causes it with Nemotron, writes a patch, re-runs tests red→green, and returns a PR-ready diff with an evidence bundle.

## Quick start

```bash
npm ci
npm test
npm run typecheck
# offline demo (no key needed, deterministic fallback)
npm run build && node dist/src/index.js --alert fixture/alert.json
# live Nemotron (needs Token Factory credits)
set NEBIUS_API_KEY=your_key
node dist/src/index.js --alert fixture/alert.json
```

Static web demo: open `docs/demo.html` in a browser.

## How Nemotron + Nebius are used

- Client: `src/nebius.ts` calls `https://api.tokenfactory.nebius.com/v1/chat/completions` (OpenAI-compatible) with tier routing: `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B` for fast triage, `nvidia/Nemotron-3-Ultra-550b-a55b` for deep root-cause reasoning.
- Token Factory gives one endpoint for fast and reasoning calls with no GPU to manage; credits stretch further by routing cheap steps to Nano.
- Flow: `src/index.ts` → triage → `sandbox.runFixtureTest` (repro) → diagnose → patch → verify → `evidence.writeEvidence`. Any LLM step falls back deterministically so the demo never breaks.

## License

MIT — see `LICENSE`.
