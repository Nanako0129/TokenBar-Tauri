<h1 align="center">TokenBar</h1>

<p align="center">
  <strong>AI token usage monitor for the macOS menu bar.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square" alt="MIT Licence">
  <img src="https://img.shields.io/badge/macOS-11%2B-black?style=flat-square&logo=apple" alt="macOS 11+">
  <img src="https://img.shields.io/badge/Apple%20Silicon-arm64-success?style=flat-square" alt="Apple Silicon">
  <img src="https://img.shields.io/badge/built%20with-Tauri%202-FFC131?style=flat-square&logo=tauri&logoColor=black" alt="Tauri 2">
</p>

<br>

**TokenBar** is a local-first **AI token usage monitor for the macOS menu bar**. It sits in the menu bar — no Dock icon, no telemetry, no account — and reads your local AI coding session logs on-device to show what you're spending across **25+ AI coding agents** (Claude Code, Codex CLI, Cursor, OpenCode, Gemini CLI, Copilot CLI, Amp, Droid, Hermes, Goose, Kilo/KiloCode, Roo Code, Qwen, Kimi, Crush, Zed, Kiro, Trae, Warp, and more).

Clicking the menu-bar icon opens a frosted-glass popover with:

| Feature | What it shows |
|---|---|
| **Contribution graph** | 2D stacked token bars + an interactive 3D GitHub-style year graph |
| **Live session** | Live tokens/min and a per-(client, agent, model) throughput trace |
| **Models** | Per-model breakdown sorted by cost, with input/output/cache split |
| **Agent limits** | Claude / Codex OAuth rate-limit windows |
| **Streaks** | Daily-usage streak summary |

The menu-bar title is configurable: today's tokens, today's cost, totals, live tokens/min, or icon-only.

---

## Install

```sh
brew tap nanako0129/tokenbar
brew install --cask tokenbar
```

> Homebrew lowercases tap owners, so the tap is `nanako0129/tokenbar` (it lives
> at [github.com/Nanako0129/homebrew-tokenbar](https://github.com/Nanako0129/homebrew-tokenbar)).
> Recent Homebrew requires the explicit `brew tap` before installing a
> third-party cask.

Or grab the `TokenBar_<version>_aarch64.dmg` from [Releases](https://github.com/Nanako0129/TokenBar/releases).

The in-app updater checks GitHub Releases on launch and every 30 minutes; signed
artifacts are verified against the embedded public key before install.

---

## How it works

TokenBar is a **Tauri 2** app: a Rust shell + a React/Vite frontend. All session
parsing, dedup, and cost calculation are delegated to **`tokscale-core`** (vendored
under `vendor/tokscale-core`), so every agent tokscale supports lights up at once,
with mature LiteLLM/OpenRouter pricing. The Rust backend:

- builds the contribution graph from local logs (`usage_graph.rs` → `tokscale_core::generate_local_graph_report`),
- samples a live tokens/min rate + trace (`usage_tail.rs` → `tokscale_core::parse_local_clients`, cache-backed),
- produces a per-model report (`model_report.rs` → `tokscale_core::get_model_report`),
- fetches Claude/Codex OAuth rate-limit windows (`agent_usage.rs`).

Usage history is read locally from session logs on disk. No telemetry, no cloud
sync, no account. Network access is limited to the GitHub Releases updater
manifest and public model-pricing data.

---

## Build from source

Requires Rust (stable) and Node ≥ 20.

```sh
npm install
npm run tauri:dev      # run in development
npm run install:local  # release build → /Applications/TokenBar.app
```

Releases are signed for the in-app updater via `TAURI_SIGNING_PRIVATE_KEY`
(see `tauri signer generate`).

---

## Credits & acknowledgements

TokenBar stands on the work of others:

- **[tokcat](https://github.com/handlecusion/tokcat)** by **handlecusion** — the
  original macOS menu-bar token monitor that TokenBar is forked from. The Tauri
  shell, native tray, menu-bar cat animation, and overall dashboard design
  originate there.
- **[tokscale](https://github.com/junhoyeo/tokscale)** by **Junho Yeo** — its
  `tokscale-core` crate powers TokenBar's multi-agent session parsing,
  deduplication, and pricing. The Models view design is inspired by tokscale's TUI.

Thank you to both projects and their maintainers.

---

## License

MIT. See [LICENSE](LICENSE). Original tokcat code © its respective authors,
also under MIT.
