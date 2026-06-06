//! Live tokens/min + per-(client, agent, model) trace for the popover and the
//! menu-bar cat animation.
//!
//! Wave 2: parsing is delegated to the vendored `tokscale-core` crate, the same
//! source the contribution graph uses, so the live signal covers every agent
//! tokscale supports — not just the hand-tailed Claude/Codex/Hermes of before.
//! tokscale-core has no streaming/tail API, but `parse_local_clients` is sync
//! and cache-backed (disk message cache + Codex incremental + SQLite WAL
//! invalidation), so re-parsing on every tick only touches changed files.
//!
//! Each `tick()` re-parses the last couple of days and *replaces* the in-memory
//! event window. Snapshot-replace (rather than incremental append) means we
//! lean on tokscale's own dedup and never carry cross-tick duplicates.

use chrono::{Duration, Local};
use parking_lot::Mutex;
use serde::Serialize;
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

/// Retain a generous window so any `rate_in_window` / `trace` query (max 10m in
/// practice) is satisfiable, and so the window stays correct across midnight.
const EVENT_WINDOW_SECS: i64 = 3600;

#[derive(Debug, Clone, Serialize)]
pub struct UsageEvent {
    pub ts_ms: i64,
    pub client: String,
    pub agent: String,
    pub model: String,
    pub input: i64,
    pub output: i64,
    pub cache_read: i64,
    pub cache_write: i64,
}

impl UsageEvent {
    fn total(&self) -> i64 {
        self.input + self.output + self.cache_read + self.cache_write
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct TraceBucket {
    pub client: String,
    pub agent: String,
    pub model: String,
    pub tokens: i64,
    pub messages: u32,
    pub tokens_per_min: f32,
}

pub struct UsageTailer {
    events: Mutex<Vec<UsageEvent>>,
}

impl UsageTailer {
    pub fn new() -> Self {
        Self {
            events: Mutex::new(Vec::new()),
        }
    }

    /// Re-parse recent local sessions via tokscale-core and replace the event
    /// window. Returns the number of events now in the window (cheap to compute
    /// and only used as a "did anything happen" hint by callers).
    pub fn tick(&self) -> usize {
        // `since` is date-granular; reach back one day so a sub-hour window that
        // straddles midnight still sees yesterday's tail. tokscale's cache keeps
        // this bounded regardless of total history size.
        let since = (Local::now() - Duration::days(1))
            .format("%Y-%m-%d")
            .to_string();
        let options = tokscale_core::LocalParseOptions {
            since: Some(since),
            ..Default::default()
        };

        let parsed = match tokscale_core::parse_local_clients(options) {
            Ok(parsed) => parsed,
            Err(_) => return self.events.lock().len(),
        };

        let cutoff = now_ms() - EVENT_WINDOW_SECS * 1000;
        let mut next: Vec<UsageEvent> = parsed
            .messages
            .into_iter()
            // ParsedMessage.timestamp is unix milliseconds (see
            // tokscale-core sessions::mod::timestamp_to_date, which feeds it to
            // chrono's timestamp_millis_opt).
            .filter(|m| m.timestamp >= cutoff)
            .map(|m| {
                let agent = m.agent.clone().unwrap_or_else(|| m.client.clone());
                UsageEvent {
                    ts_ms: m.timestamp,
                    client: m.client,
                    agent,
                    model: m.model_id,
                    input: m.input,
                    output: m.output,
                    cache_read: m.cache_read,
                    cache_write: m.cache_write,
                }
            })
            .collect();
        next.sort_by_key(|e| e.ts_ms);

        let len = next.len();
        *self.events.lock() = next;
        len
    }

    pub fn rate_per_min(&self) -> f32 {
        self.window_total(60) as f32
    }

    pub fn rate_in_window(&self, window_secs: i64) -> f32 {
        if window_secs <= 0 {
            return 0.0;
        }
        let total = self.window_total(window_secs) as f32;
        let window_min = window_secs as f32 / 60.0;
        total / window_min
    }

    fn window_total(&self, secs: i64) -> i64 {
        let cutoff = now_ms() - secs * 1000;
        let events = self.events.lock();
        events
            .iter()
            .filter(|e| e.ts_ms >= cutoff)
            .map(|e| e.total())
            .sum()
    }

    /// Per-(client, agent, model) breakdown over `window_secs`. Frontend
    /// decides whether to collapse rows by client based on the user's
    /// "detailed trace" setting.
    pub fn trace(&self, window_secs: i64) -> Vec<TraceBucket> {
        let cutoff = now_ms() - window_secs * 1000;
        let events = self.events.lock();
        let mut groups: HashMap<(String, String, String), (i64, u32)> = HashMap::new();
        for e in events.iter() {
            if e.ts_ms < cutoff {
                continue;
            }
            let key = (e.client.clone(), e.agent.clone(), e.model.clone());
            let slot = groups.entry(key).or_insert((0, 0));
            slot.0 += e.total();
            slot.1 += 1;
        }
        let window_min = (window_secs as f32 / 60.0).max(1.0 / 60.0);
        let mut out: Vec<TraceBucket> = groups
            .into_iter()
            .map(|((client, agent, model), (tokens, messages))| TraceBucket {
                client,
                agent,
                model,
                tokens,
                messages,
                tokens_per_min: tokens as f32 / window_min,
            })
            .collect();
        out.sort_by(|a, b| b.tokens.cmp(&a.tokens));
        out
    }
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}
