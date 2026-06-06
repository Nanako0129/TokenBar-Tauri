//! Per-agent (sub-agent) usage breakdown for the popover. tokscale-core has no
//! ready-made agents report, so this parses the local unified message stream
//! (`parse_local_unified_messages`, which loads pricing itself) and aggregates
//! by `UnifiedMessage.agent` — echoing tokscale's TUI "Agents" view, where
//! named sub-agents are ranked by cost. Messages with no agent attribution are
//! folded into a single "Main" bucket so every message is accounted for.
//!
//! Like the other reports, it drives the async core on a short-lived
//! current-thread runtime (callers run it inside `spawn_blocking`).

use std::collections::{BTreeSet, HashMap};

use serde::Serialize;
use serde_json::Value;

#[derive(Debug, Default, Clone)]
struct AgentAggregator {
    clients: BTreeSet<String>,
    input: i64,
    output: i64,
    cache_read: i64,
    cache_write: i64,
    reasoning: i64,
    cost: f64,
    messages: i32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AgentEntry {
    agent: String,
    clients: Vec<String>,
    input: i64,
    output: i64,
    cache_read: i64,
    cache_write: i64,
    reasoning: i64,
    total: i64,
    cost: f64,
    messages: i32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AgentsReportData {
    entries: Vec<AgentEntry>,
    total_cost: f64,
    total_messages: i32,
}

/// Build the per-agent report for `year` (empty string = all time).
pub fn run(year: &str) -> Result<Value, String> {
    let year = normalize_year(year)?;

    let options = tokscale_core::LocalParseOptions {
        year,
        ..Default::default()
    };

    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .map_err(|e| format!("build runtime: {}", e))?;
    let messages = runtime.block_on(tokscale_core::parse_local_unified_messages(options))?;

    let data = aggregate(messages);
    serde_json::to_value(data).map_err(|e| format!("serialize agents report: {}", e))
}

fn normalize_year(year: &str) -> Result<Option<String>, String> {
    let trimmed = year.trim();
    if trimmed.is_empty() {
        return Ok(None);
    }
    if trimmed.len() == 4 && trimmed.chars().all(|c| c.is_ascii_digit()) {
        Ok(Some(trimmed.to_string()))
    } else {
        Err(format!("invalid year filter: {}", year))
    }
}

fn aggregate(messages: Vec<tokscale_core::UnifiedMessage>) -> AgentsReportData {
    let mut by_agent: HashMap<String, AgentAggregator> = HashMap::new();

    for msg in messages {
        let name = match msg.agent.as_deref() {
            Some(raw) if !raw.trim().is_empty() => {
                tokscale_core::sessions::normalize_agent_name(raw)
            }
            _ => "Main".to_string(),
        };
        let agg = by_agent.entry(name).or_default();
        agg.clients.insert(msg.client.clone());
        agg.input += msg.tokens.input;
        agg.output += msg.tokens.output;
        agg.cache_read += msg.tokens.cache_read;
        agg.cache_write += msg.tokens.cache_write;
        agg.reasoning += msg.tokens.reasoning;
        agg.cost += msg.cost;
        agg.messages += msg.message_count.max(0);
    }

    let mut entries: Vec<AgentEntry> = by_agent
        .into_iter()
        .map(|(agent, agg)| {
            let total = agg.input + agg.output + agg.cache_read + agg.cache_write + agg.reasoning;
            AgentEntry {
                agent,
                clients: agg.clients.into_iter().collect(),
                input: agg.input,
                output: agg.output,
                cache_read: agg.cache_read,
                cache_write: agg.cache_write,
                reasoning: agg.reasoning,
                total,
                cost: agg.cost,
                messages: agg.messages,
            }
        })
        .collect();

    entries.sort_by(|a, b| {
        b.cost
            .partial_cmp(&a.cost)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then(b.total.cmp(&a.total))
    });

    let total_cost: f64 = entries.iter().map(|e| e.cost).sum();
    let total_messages: i32 = entries.iter().map(|e| e.messages).sum();

    AgentsReportData {
        entries,
        total_cost,
        total_messages,
    }
}
