import express from 'express'
import { createServer as createViteServer } from 'vite'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = 4061
const REFRESH_MS = 3 * 60 * 1000

const MOCK_CLIENTS = [
  { id: 'claude', model: 'claude-sonnet-4.5', provider: 'anthropic', share: 0.31, price: 6.2 },
  { id: 'codex', model: 'gpt-5.2-codex', provider: 'openai', share: 0.24, price: 5.9 },
  { id: 'cursor', model: 'composer-1.5', provider: 'cursor', share: 0.15, price: 4.8 },
  { id: 'gemini', model: 'gemini-2.5-pro', provider: 'google', share: 0.11, price: 3.9 },
  { id: 'opencode', model: 'kimi-k2.5', provider: 'opencode', share: 0.08, price: 3.1 },
  { id: 'copilot', model: 'gpt-4.1', provider: 'github', share: 0.05, price: 4.2 },
  { id: 'amp', model: 'claude-sonnet-4.5', provider: 'sourcegraph', share: 0.03, price: 5.6 },
  { id: 'droid', model: 'droid-agent', provider: 'factory', share: 0.02, price: 3.6 },
  { id: 'hermes', model: 'hermes-agent', provider: 'local', share: 0.01, price: 2.4 },
]

function pad2(n) {
  return String(n).padStart(2, '0')
}

function isoDate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function addDays(d, days) {
  const next = new Date(d)
  next.setDate(next.getDate() + days)
  return next
}

function tokenBreakdown(total) {
  const input = Math.round(total * 0.46)
  const output = Math.round(total * 0.25)
  const cacheRead = Math.round(total * 0.15)
  const cacheWrite = Math.round(total * 0.08)
  const reasoning = Math.max(0, total - input - output - cacheRead - cacheWrite)
  return { input, output, cacheRead, cacheWrite, reasoning }
}

function mockGraph(year) {
  const requested = Number.parseInt(year || '', 10)
  const nowDate = new Date()
  const y = Number.isFinite(requested) ? requested : nowDate.getFullYear()
  const start = new Date(y, 0, 1)
  const end = y === nowDate.getFullYear() ? nowDate : new Date(y, 11, 31)
  const generatedAt = nowDate.toISOString()
  const contributions = []

  for (let d = new Date(start), i = 0; d <= end; d = addDays(d, 1), i += 1) {
    const dow = d.getDay()
    const weekend = dow === 0 || dow === 6
    const active = i % 11 !== 0 && (!weekend || i % 4 === 0)
    if (!active) continue

    const wave = 1 + Math.sin(i / 8) * 0.24 + Math.cos(i / 17) * 0.16
    const spike = i % 43 === 0 ? 2.9 : i % 23 === 0 ? 1.75 : 1
    const base = (weekend ? 1_600_000 : 4_800_000) * wave * spike
    const clients = []
    let totalTokens = 0
    let totalCost = 0
    let totalMessages = 0
    const dayBreakdown = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 }

    for (let idx = 0; idx < MOCK_CLIENTS.length; idx += 1) {
      const client = MOCK_CLIENTS[idx]
      const include = idx < 3 || (i + idx * 3) % (idx + 4) !== 0
      if (!include) continue
      const variance = 0.78 + (((i + 3) * (idx + 5)) % 11) / 20
      const tokens = Math.round((base * client.share * variance) / 1000) * 1000
      if (tokens <= 0) continue
      const breakdown = tokenBreakdown(tokens)
      const cost = Number(((tokens / 1_000_000) * client.price).toFixed(2))
      const messages = Math.max(1, Math.round(tokens / 68000))
      clients.push({
        client: client.id,
        modelId: client.model,
        providerId: client.provider,
        tokens: breakdown,
        cost,
        messages,
      })
      totalTokens += tokens
      totalCost += cost
      totalMessages += messages
      for (const key of Object.keys(dayBreakdown)) dayBreakdown[key] += breakdown[key]
    }

    contributions.push({
      date: isoDate(d),
      totals: {
        tokens: totalTokens,
        cost: Number(totalCost.toFixed(2)),
        messages: totalMessages,
      },
      intensity: 1,
      tokenBreakdown: dayBreakdown,
      clients,
    })
  }

  const maxTokens = Math.max(1, ...contributions.map(c => c.totals.tokens))
  for (const c of contributions) {
    c.intensity = Math.max(1, Math.min(4, Math.ceil((c.totals.tokens / maxTokens) * 4)))
  }

  const totalTokens = contributions.reduce((sum, c) => sum + c.totals.tokens, 0)
  const totalCost = Number(contributions.reduce((sum, c) => sum + c.totals.cost, 0).toFixed(2))
  const activeDays = contributions.length
  const clients = Array.from(new Set(contributions.flatMap(c => c.clients.map(client => client.client)))).sort()
  const models = Array.from(new Set(contributions.flatMap(c => c.clients.map(client => client.modelId)))).sort()
  const dateRange = {
    start: contributions[0]?.date || '',
    end: contributions.at(-1)?.date || '',
  }

  return {
    meta: {
      generatedAt,
      version: 'tokenbar-dev',
      dateRange,
    },
    summary: {
      totalTokens,
      totalCost,
      totalDays: contributions.length,
      activeDays,
      averagePerDay: activeDays > 0 ? totalCost / activeDays : 0,
      maxCostInSingleDay: Math.max(0, ...contributions.map(c => c.totals.cost)),
      clients,
      models,
    },
    years: [
      {
        year: String(y),
        totalTokens,
        totalCost,
        range: dateRange,
      },
    ],
    contributions,
  }
}

function mockAgentUsage() {
  const nowMs = Date.now()
  const now = new Date(nowMs).toISOString()
  const iso = mins => new Date(nowMs + mins * 60_000).toISOString()
  return {
    generatedAt: now,
    agents: [
      {
        clientId: 'codex',
        source: 'oauth',
        updatedAt: now,
        identity: { email: 'dev@tokenbar.local', plan: 'Team' },
        windows: [
          // Session: ~25% through a 5h window but 59% used → "in deficit".
          { label: 'Session', usedPercent: 59, remainingPercent: 41, resetsAt: iso(225), resetText: 'Resets in 3h 45m', windowMinutes: 300 },
          // Weekly: ~62% through the week, 71% used. Linear → ~9% in deficit;
          // historical expected ~76% → ~5% in reserve + run-out risk. The exact
          // case from the screenshots, to exercise the three pace modes.
          { label: 'Weekly', usedPercent: 71, remainingPercent: 29, resetsAt: iso(64 * 60), resetText: 'Resets in 2d 16h', windowMinutes: 10080, historicalExpectedPercent: 76, runOutProbability: 0.3 },
          { label: 'gpt-5.2-codex', usedPercent: 72, remainingPercent: 28, resetText: 'resets in 5h' },
        ],
        credits: { remaining: 118.42, unlimited: false },
      },
      {
        clientId: 'claude',
        source: 'oauth',
        updatedAt: now,
        identity: { plan: 'Max' },
        windows: [
          { label: '5-hour', usedPercent: 78, remainingPercent: 22, resetText: 'resets in 37m' },
          { label: '7-day', usedPercent: 54, remainingPercent: 46, resetText: 'resets Fri' },
          { label: 'Opus', usedPercent: 34, remainingPercent: 66, resetText: 'resets Fri' },
        ],
        credits: { unlimited: true },
      },
      {
        clientId: 'antigravity',
        source: 'cli',
        updatedAt: now,
        identity: { email: 'dev@tokenbar.local', plan: 'Pro' },
        windows: [
          { label: 'Gemini 3 Pro', usedPercent: 58, remainingPercent: 42, resetsAt: iso(180), resetText: 'Resets in 3h' },
          { label: 'Claude Sonnet 4.6', usedPercent: 12, remainingPercent: 88, resetsAt: iso(300), resetText: 'Resets in 5h' },
          { label: 'Gemini 3 Flash', usedPercent: 4, remainingPercent: 96, resetsAt: iso(60), resetText: 'Resets in 1h' },
        ],
      },
    ],
  }
}

function mockModelReport() {
  const entries = [
    { client: 'claude', model: 'claude-sonnet-4.5', provider: 'anthropic', input: 1240000, output: 320000, cacheRead: 4100000, cacheWrite: 180000, reasoning: 0, messageCount: 412, cost: 23.41, msPer1KTokens: 38 },
    { client: 'codex', model: 'gpt-5.2-codex', provider: 'openai', input: 880000, output: 210000, cacheRead: 2600000, cacheWrite: 90000, reasoning: 140000, messageCount: 298, cost: 15.07, msPer1KTokens: 52 },
    { client: 'opencode', model: 'kimi-k2.5', provider: 'moonshot', input: 410000, output: 96000, cacheRead: 720000, cacheWrite: 41000, reasoning: 0, messageCount: 121, cost: 3.82, msPer1KTokens: null },
    { client: 'gemini', model: 'gemini-2.5-pro', provider: 'google', input: 220000, output: 64000, cacheRead: 310000, cacheWrite: 0, reasoning: 0, messageCount: 73, cost: 2.11, msPer1KTokens: 44 },
  ].map(e => ({ ...e, total: e.input + e.output + e.cacheRead + e.cacheWrite + e.reasoning }))
  return {
    entries,
    totalInput: entries.reduce((s, e) => s + e.input, 0),
    totalOutput: entries.reduce((s, e) => s + e.output, 0),
    totalCacheRead: entries.reduce((s, e) => s + e.cacheRead, 0),
    totalCacheWrite: entries.reduce((s, e) => s + e.cacheWrite, 0),
    totalMessages: entries.reduce((s, e) => s + e.messageCount, 0),
    totalCost: entries.reduce((s, e) => s + e.cost, 0),
  }
}

function mockHourlyReport() {
  // A plausible daily rhythm: quiet overnight, ramps through the workday.
  const shape = [2, 1, 1, 0, 0, 0, 1, 3, 8, 14, 18, 16, 12, 17, 20, 19, 15, 11, 7, 6, 5, 4, 3, 2]
  const entries = shape.map((w, h) => {
    const tokens = w * 90000
    const input = Math.round(tokens * 0.18)
    const output = Math.round(tokens * 0.06)
    const cacheRead = Math.round(tokens * 0.7)
    const cacheWrite = Math.round(tokens * 0.06)
    const reasoning = tokens - input - output - cacheRead - cacheWrite
    return {
      hour: `2026-06-07 ${String(h).padStart(2, '0')}:00`,
      clients: ['claude', 'codex'],
      models: ['claude-sonnet-4.5', 'gpt-5.2-codex'],
      input,
      output,
      cacheRead,
      cacheWrite,
      reasoning,
      total: tokens,
      messageCount: w * 4,
      turnCount: w * 2,
      cost: w * 0.42,
    }
  })
  return { entries, totalCost: entries.reduce((s, e) => s + e.cost, 0) }
}

function mockAgentsReport() {
  const entries = [
    { agent: 'Main', clients: ['claude', 'codex'], cost: 28.4, messages: 510, total: 6100000 },
    { agent: 'Planner-Sisyphus', clients: ['claude'], cost: 9.1, messages: 142, total: 1800000 },
    { agent: 'Atlas', clients: ['opencode'], cost: 4.7, messages: 88, total: 920000 },
    { agent: 'Reviewer', clients: ['codex'], cost: 2.3, messages: 41, total: 410000 },
  ].map(e => ({
    ...e,
    input: Math.round(e.total * 0.2),
    output: Math.round(e.total * 0.07),
    cacheRead: Math.round(e.total * 0.66),
    cacheWrite: Math.round(e.total * 0.05),
    reasoning: Math.round(e.total * 0.02),
  }))
  return {
    entries,
    totalCost: entries.reduce((s, e) => s + e.cost, 0),
    totalMessages: entries.reduce((s, e) => s + e.messages, 0),
  }
}

function mockTrace() {
  const trace = [
    { client: 'claude-code', agent: 'main', model: 'claude-sonnet-4.5', tokens: 184000, messages: 12, tokens_per_min: 18400 },
    { client: 'codex-cli', agent: 'main', model: 'gpt-5.2-codex', tokens: 126000, messages: 9, tokens_per_min: 12600 },
    { client: 'cursor', agent: 'composer', model: 'composer-1.5', tokens: 82000, messages: 7, tokens_per_min: 8200 },
    { client: 'gemini-cli', agent: 'main', model: 'gemini-2.5-pro', tokens: 47000, messages: 4, tokens_per_min: 4700 },
    { client: 'opencode', agent: 'main', model: 'kimi-k2.5', tokens: 31000, messages: 3, tokens_per_min: 3100 },
  ]
  return {
    tokensPerMin: trace.reduce((sum, b) => sum + b.tokens_per_min, 0),
    trace,
  }
}

const cache = new Map()

function ensureEntry(year) {
  let entry = cache.get(year)
  if (!entry) {
    entry = { data: mockGraph(year), lastFetched: Date.now(), subscribers: new Set(), timer: null }
    cache.set(year, entry)
  }
  return entry
}

function broadcast(year) {
  const entry = ensureEntry(year)
  const payload = JSON.stringify({
    year,
    fetchedAt: new Date(entry.lastFetched).toISOString(),
    payload: entry.data,
  })
  const msg = `event: data\ndata: ${payload}\n\n`
  for (const res of entry.subscribers) {
    try { res.write(msg) } catch {}
  }
}

function startTimer(year) {
  const entry = ensureEntry(year)
  if (entry.timer) return
  entry.timer = setInterval(() => {
    entry.data = mockGraph(year)
    entry.lastFetched = Date.now()
    broadcast(year)
  }, REFRESH_MS)
}

function stopTimerIfIdle(year) {
  const entry = cache.get(year)
  if (!entry) return
  if (entry.subscribers.size === 0 && entry.timer) {
    clearInterval(entry.timer)
    entry.timer = null
  }
}

const app = express()

app.get('/api/graph', (req, res) => {
  const year = String(req.query.year || '')
  res.json(ensureEntry(year).data)
})

app.get('/api/agent-usage', (_req, res) => {
  res.json(mockAgentUsage())
})

app.get('/api/rate', (_req, res) => {
  res.json(mockTrace())
})

app.get('/api/model-report', (req, res) => {
  const year = String(req.query.year || '')
  res.json({ year, payload: mockModelReport() })
})

app.get('/api/hourly-report', (req, res) => {
  const year = String(req.query.year || '')
  res.json({ year, payload: mockHourlyReport() })
})

app.get('/api/agents-report', (req, res) => {
  const year = String(req.query.year || '')
  res.json({ year, payload: mockAgentsReport() })
})

app.get('/api/stream', (req, res) => {
  const year = String(req.query.year || '')
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  res.flushHeaders?.()
  req.socket.setKeepAlive(true)
  req.socket.setNoDelay(true)
  req.socket.setTimeout(0)

  const entry = ensureEntry(year)
  entry.subscribers.add(res)
  broadcast(year)

  const keepalive = setInterval(() => {
    try { res.write(`: keepalive ${Date.now()}\n\n`) } catch {}
  }, 25000)

  startTimer(year)
  req.on('close', () => {
    clearInterval(keepalive)
    entry.subscribers.delete(res)
    stopTimerIfIdle(year)
  })
})

const httpServer = http.createServer(app)

const vite = await createViteServer({
  root: __dirname,
  server: {
    middlewareMode: true,
    hmr: { server: httpServer, port: PORT },
  },
  appType: 'spa',
})
app.use(vite.middlewares)

httpServer.listen(PORT, () => {
  console.log(`[tokenbar] dev server listening on http://localhost:${PORT}`)
})
