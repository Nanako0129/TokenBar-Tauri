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

<p align="center">
  <img src="docs/screenshots/overview.png" alt="TokenBar overview" width="380">
</p>

The menu-bar title is configurable — today's tokens, today's cost, lifetime totals, live tokens/min, or icon-only. And the **menu-bar cat spins faster the more tokens you burn** — your throughput as a single glanceable critter. The spinning cat is the signature creative touch of the original [tokcat](https://github.com/handlecusion/tokcat) by **handlecusion**, kept here with gratitude.

<p align="center">
  <img src="docs/screenshots/menubar.gif" alt="The menu-bar cat spinning next to today's cost" width="320">
</p>

---

## The dashboard

Clicking the menu-bar icon opens a frosted-glass popover. A row of **app tabs**
(Overview / Claude / Codex / …) filters _which_ agents you're looking at, and a
**view switch** picks _how_ that data is broken down — inspired by
[tokscale](https://github.com/junhoyeo/tokscale)'s TUI:

| View | What it shows |
|---|---|
| **Overview** | The contribution chart (2D stacked token bars or an interactive 3D GitHub-style year graph), agent limits, the live session trace, the model breakdown, and streaks |
| **Models** | Every model ranked by cost, with its cost share and a dim `In · Out · CR · CW` token split |
| **Daily** | Active days newest-first; select a day to drill into that day's per-model breakdown |
| **Hourly** | A 24-hour-of-day rhythm — when in the day your tokens are actually spent |
| **Stats** | The contribution graph over a headline summary: total spend, active days, streaks, favorite model, best day |
| **Agents** | Sub-agents ranked by cost, with their source apps, message count, and tokens |

<table>
  <tr>
    <td align="center"><img src="docs/screenshots/models.png" alt="Models view" width="300"><br><sub><b>Models</b> — by cost</sub></td>
    <td align="center"><img src="docs/screenshots/daily.png" alt="Daily view" width="300"><br><sub><b>Daily</b> — with day drill-down</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/hourly.png" alt="Hourly view" width="300"><br><sub><b>Hourly</b> — 24-hour rhythm</sub></td>
    <td align="center"><img src="docs/screenshots/stats.png" alt="Stats view" width="300"><br><sub><b>Stats</b> — headline summary</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/agents.png" alt="Agents view" width="300"><br><sub><b>Agents</b> — sub-agents by cost</sub></td>
    <td align="center"><img src="docs/screenshots/contribution-3d.png" alt="3D contribution graph" width="300"><br><sub><b>3D</b> — GitHub-style year graph</sub></td>
  </tr>
</table>

The contribution chart stacks tokens by **model** (tokscale-style provider
shades) or by **agent** (brand colors), toggled in the chart header. Agent limit
bars are color-coded by remaining quota and can count up by amount **used** or
down to what's **left** (Settings → Agent limits).

<p align="center">
  <img src="docs/screenshots/settings.png" alt="TokenBar settings" width="320">
</p>

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
- produces per-hour and per-agent reports (`hourly_report.rs`, `agents_report.rs`),
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
  shell, native tray, and overall dashboard design originate there — including
  the **spinning menu-bar cat that digests your tokens**, handlecusion's
  signature creative flourish, which TokenBar proudly keeps.
- **[tokscale](https://github.com/junhoyeo/tokscale)** by **Junho Yeo** — its
  `tokscale-core` crate powers TokenBar's multi-agent session parsing,
  deduplication, and pricing. The multi-view dashboard (Models / Daily / Hourly /
  Stats / Agents) is inspired by tokscale's TUI.

Thank you to both projects and their maintainers.

---

## License

MIT. See [LICENSE](LICENSE). Original tokcat code © its respective authors,
also under MIT.
