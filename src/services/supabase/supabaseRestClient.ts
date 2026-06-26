export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export class SupabaseRestClient {
  constructor(private readonly config: SupabaseConfig) {}

  async insert<T extends Record<string, unknown>>(table: string, row: T): Promise<void> {
    const response = await fetch(`${this.config.url}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        apikey: this.config.anonKey,
        Authorization: `Bearer ${this.config.anonKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify(row)
    });

    if (!response.ok) {
      throw new Error(`Supabase 写入失败：${response.status}`);
    }
  }

  async upsert<T extends Record<string, unknown>>(table: string, row: T, onConflict: string): Promise<void> {
    const response = await fetch(`${this.config.url}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`, {
      method: 'POST',
      headers: {
        apikey: this.config.anonKey,
        Authorization: `Bearer ${this.config.anonKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify(row)
    });

    if (!response.ok) {
      throw new Error(`Supabase 更新失败：${response.status}`);
    }
  }
}
