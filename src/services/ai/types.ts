export interface DeckDraft {
  markdown: string;
  /** Provider label and model that wrote it. */
  provider: string;
  model: string;
  stats?: {
    tokensPerSecond?: number;
    totalTokens?: number;
  };
}

export type AiTaskType = "deck" | "slide" | "improve" | "notes" | "summarize";

export interface GenerateOptions {
  slides?: number;
  signal?: AbortSignal;
  provider?: "remote" | "local";
  modelId?: string;
  task?: AiTaskType;
  context?: string;
  instruction?: string;
  slideContent?: string;
  /** A previous draft to revise; the prompt is then the change to make. */
  current?: string;
  onToken?: (token: string, delta: string) => void;
}

/** Server AI endpoint or local SLM status from the ping/health check. */
export interface AiHealth {
  configured: boolean;
  ok: boolean;
  provider?: string;
  model?: string;
  latencyMs?: number;
  method?: "models" | "chat" | "local";
  modelListed?: boolean;
  status?: number;
  error?: string;
  isLocal?: boolean;
  backend?: "webgpu" | "wasm" | "cpu";
}

export interface AiDeckService {
  generate(prompt: string, opts?: GenerateOptions): Promise<DeckDraft>;
  health(): Promise<AiHealth>;
}
