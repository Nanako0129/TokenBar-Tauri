export interface TraceBucket {
  client: string
  agent: string
  model: string
  tokens: number
  messages: number
  tokens_per_min: number
}

export interface RateUpdate {
  tokensPerMin: number
  trace: TraceBucket[]
}
