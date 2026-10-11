import type { SlideEngine, TemplateStoreApi } from "@/engine/engine";
import type { TemplateRecord } from "@/engine/types";
import type { TemplateRepository } from "./types";
import { builtinTemplates } from "./seed";

/** Byte-level persistence for store snapshots (IndexedDB in the browser). */
export interface SnapshotStorage {
  load(): Promise<Uint8Array | undefined>;
  save(bytes: Uint8Array): Promise<void>;
}

/**
 * Local-first repository: search, paging and filtering run inside the Rust
 * `TemplateStore`; the store is snapshotted (`SWT1` binary) after each write.
 */
export class WasmTemplateRepository implements TemplateRepository {
  private store: Promise<TemplateStoreApi>;

  constructor(engine: SlideEngine, private storage?: SnapshotStorage) {
    this.store = this.open(engine);
  }

  private async open(engine: SlideEngine): Promise<TemplateStoreApi> {
    let store: TemplateStoreApi | null = null;
    const bytes = await this.storage?.load().catch(() => undefined);
    if (bytes) {
      try {
        store = engine.createStore(bytes);
      } catch {
        store = null;
      }
    }
    store ??= engine.createStore();
    store.loadMany(builtinTemplates());
    return store;
  }

  private async persist(store: TemplateStoreApi) {
    await this.storage?.save(store.snapshot()).catch(() => undefined);
  }

  async query(filter: Parameters<TemplateStoreApi["query"]>[0]) {
    return (await this.store).query(filter);
  }

  async get(id: string) {
    return (await this.store).get(id);
  }

  async save(t: TemplateRecord) {
    const store = await this.store;
    const authorStr =
      typeof t.author === "string"
        ? t.author
        : typeof t.author === "object" && t.author !== null
        ? ((t.author as { name?: string; github?: string }).name ||
           (t.author as { name?: string; github?: string }).github ||
           "You")
        : "You";
    const record: TemplateRecord = { ...t, author: authorStr };
    store.upsert(record);
    await this.persist(store);
    return record;
  }

  async remove(id: string) {
    const store = await this.store;
    const ok = store.remove(id);
    if (ok) await this.persist(store);
    return ok;
  }

  async categories(source: string) {
    return (await this.store).categories(source);
  }
}
