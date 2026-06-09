<h1 align="center">TokenBar</h1>

<p align="center">
  <strong>macOS 選單列上的 AI token 用量監控。</strong>
</p>

<p align="center">
  <a href="README.md">English</a> ·
  <strong>繁體中文</strong> ·
  <a href="README.ko-KR.md">한국어</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square" alt="MIT Licence">
  <img src="https://img.shields.io/badge/macOS-11%2B-black?style=flat-square&logo=apple" alt="macOS 11+">
  <img src="https://img.shields.io/badge/Apple%20Silicon-arm64-success?style=flat-square" alt="Apple Silicon">
  <img src="https://img.shields.io/badge/built%20with-Tauri%202-FFC131?style=flat-square&logo=tauri&logoColor=black" alt="Tauri 2">
</p>

<br>

**TokenBar** 是一款本地優先（local-first）的 **macOS 選單列 AI token 用量監控工具**。它常駐在選單列——沒有 Dock 圖示、無遙測、免帳號——在你的裝置上讀取本機的 AI 編碼工作階段記錄，呈現你在 **25+ 種 AI 編碼 agent**（Claude Code、Codex CLI、Cursor、OpenCode、Gemini CLI、Copilot CLI、Amp、Droid、Hermes、Goose、Kilo/KiloCode、Roo Code、Qwen、Kimi、Crush、Zed、Kiro、Trae、Warp 等）上的花費。

<p align="center">
  <img src="docs/screenshots/overview.png" alt="TokenBar 總覽" width="380">
</p>

選單列標題可自訂——今日 token、今日花費、累計總量、即時 tokens/min，或只顯示圖示。而且**選單列上的貓會隨著你燒掉越多 token 轉得越快**——把你的吞吐量化成一隻一眼就能看懂的小生物。這隻旋轉貓是原作 [tokcat](https://github.com/handlecusion/tokcat)（作者 **handlecusion**）的招牌創意，在此懷著感謝保留。

<p align="center">
  <img src="docs/screenshots/menubar.gif" alt="選單列上在今日花費旁旋轉的貓" width="320">
</p>

---

## 儀表板

點擊選單列圖示會開啟一個霧面玻璃的彈出視窗（popover）。一排 **app 分頁**（Overview / Claude / Codex / …）決定你**看哪些** agent，而一排 **視圖切換** 決定那些資料**怎麼拆解**——靈感來自 [tokscale](https://github.com/junhoyeo/tokscale) 的 TUI：

| 視圖 | 顯示內容 |
|---|---|
| **Overview** | 貢獻圖（2D 堆疊 token 長條，或可互動的 3D GitHub 風格年度圖）、agent 限額、即時工作階段軌跡、model 分解與連續紀錄 |
| **Models** | 每個 model 依花費排序，附花費佔比與一條淡色的 `In · Out · CR · CW` token 拆分 |
| **Daily** | 活躍日由新到舊；點選某一天可下鑽該日的各 model 分解 |
| **Hourly** | 一天 24 小時的節奏——你的 token 實際上是在一天的什麼時段被花掉 |
| **Stats** | 貢獻圖搭配重點摘要：總花費、活躍天數、連續紀錄、最愛 model、最高花費日 |
| **Agents** | 子代理依花費排序，附其來源 app、訊息數與 token |

<table>
  <tr>
    <td align="center"><img src="docs/screenshots/models.png" alt="Models 視圖" width="300"><br><sub><b>Models</b> — 依花費</sub></td>
    <td align="center"><img src="docs/screenshots/daily.png" alt="Daily 視圖" width="300"><br><sub><b>Daily</b> — 含當日下鑽</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/hourly.png" alt="Hourly 視圖" width="300"><br><sub><b>Hourly</b> — 24 小時節奏</sub></td>
    <td align="center"><img src="docs/screenshots/stats.png" alt="Stats 視圖" width="300"><br><sub><b>Stats</b> — 重點摘要</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/agents.png" alt="Agents 視圖" width="300"><br><sub><b>Agents</b> — 子代理依花費</sub></td>
    <td align="center"><img src="docs/screenshots/contribution-3d.png" alt="3D 貢獻圖" width="300"><br><sub><b>3D</b> — GitHub 風格年度圖</sub></td>
  </tr>
</table>

貢獻圖可依 **model**（tokscale 風格的供應商漸層色）或依 **agent**（品牌色）堆疊，在圖表標題列切換。agent 限額條會依剩餘額度上色，並可選擇正著算（已**用**量）或倒著算（**剩餘**量）（Settings → Agent limits）。

<p align="center">
  <img src="docs/screenshots/settings.png" alt="TokenBar 設定" width="320">
</p>

---

## 安裝

```sh
brew install --cask nanako0129/tokenbar/tokenbar
```

> 完整的 `owner/tap/cask` 形式會自動 tap
> [nanako0129/homebrew-tokenbar](https://github.com/Nanako0129/homebrew-tokenbar)
> ——不需要另外執行 `brew tap`（Homebrew 會把 tap owner 轉成小寫）。

如果你曾安裝 `v0.4.2` 之前的 TokenBar，請重新安裝一次 cask：

```sh
brew reinstall --cask nanako0129/tokenbar/tokenbar
```

### Code signing 與 Gatekeeper

TokenBar 目前尚未經 Apple notarization。它是免費、原始碼可審計的專案，而現階段還不值得為 Developer Program 支付年費。因此 Homebrew cask 會在安裝時移除 `com.apple.quarantine` 屬性，讓 app 啟動時不會遇到 Gatekeeper 的首次開啟提示。實際上，這代表 cask 會替 TokenBar 繞過 Gatekeeper 的首次啟動檢查。

你仍然可以審計並信任它的理由：

- TokenBar 採 MIT 授權且原始碼可審計；你也可以用 `npm run install:local` 自行建置。
- 沒有 telemetry、不需要帳號；session logs 只會在本機讀取，不會離開你的機器。
- 網路存取僅限於更新資訊清單與公開 model 定價資料。
- 內建更新會先以內嵌 minisign 公鑰驗證後才安裝。

如果你希望完整交給 Gatekeeper 把關，請改用原始碼自行建置，不要使用 cask。

內建更新器會在啟動時與每 30 分鐘檢查 GitHub Releases；簽章產物會先以內嵌公鑰驗證後才安裝。

---

## 運作方式

TokenBar 是一個 **Tauri 2** app：Rust 外殼 + React/Vite 前端。所有工作階段解析、去重與成本計算都委派給 **`tokscale-core`**（vendored 於 `vendor/tokscale-core`），因此 tokscale 支援的每個 agent 都會一次點亮，並帶有成熟的 LiteLLM/OpenRouter 定價。Rust 後端會：

- 由本機記錄建立貢獻圖（`usage_graph.rs` → `tokscale_core::generate_local_graph_report`），
- 取樣即時 tokens/min 速率與軌跡（`usage_tail.rs` → `tokscale_core::parse_local_clients`，走快取），
- 產生各 model 報表（`model_report.rs` → `tokscale_core::get_model_report`），
- 產生各小時與各 agent 報表（`hourly_report.rs`、`agents_report.rs`），
- 取得 Claude/Codex 的 OAuth 限額視窗（`agent_usage.rs`）。

用量歷史只從磁碟上的工作階段記錄在本機讀取。無遙測、無雲端同步、免帳號。網路存取僅限於 GitHub Releases 更新器資訊清單，以及公開的 model 定價資料。

---

## 從原始碼建置

需要 Rust（stable）與 Node ≥ 22。

```sh
npm install
npm run tauri:dev      # 開發模式執行
npm run install:local  # release 建置 → /Applications/TokenBar.app
```

Release 會以 `TAURI_SIGNING_PRIVATE_KEY` 為內建更新器簽章（見 `tauri signer generate`）。

---

## 致謝

TokenBar 站在許多人的工作之上：

- **[tokcat](https://github.com/handlecusion/tokcat)**，作者 **handlecusion**——TokenBar 所 fork 的原始 macOS 選單列 token 監控工具。Tauri 外殼、原生 tray、以及整體儀表板設計都源自於此——包括那隻**會吃掉你 token 的旋轉選單列貓**，handlecusion 的招牌創意，TokenBar 很自豪地保留了它。
- **[tokscale](https://github.com/junhoyeo/tokscale)**，作者 **Junho Yeo**——其 `tokscale-core` crate 驅動了 TokenBar 的多 agent 工作階段解析、去重與定價。多視圖儀表板（Models / Daily / Hourly / Stats / Agents）的設計靈感來自 tokscale 的 TUI。

感謝這兩個專案及其維護者。

---

## 授權

MIT。見 [LICENSE](LICENSE)。原始 tokcat 程式碼之著作權歸其各自作者所有，同樣採 MIT 授權。
