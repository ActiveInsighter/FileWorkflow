export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export class SupabaseRestClient {
  constructor(private readonly config: SupabaseConfig) {}

  async insert<T extends Record<string, unknown>>(table: string, row: T): Promise<void> {
    const response = await fetch(`${this.baseUrl(table)}`, {
      method: 'POST',
      headers: this.headers('return=minimal'),
      body: JSON.stringify(row)
    });

    await assertOk(response, 'Supabase 写入失败');
  }

  async upsert<T extends Record<string, unknown>>(table: string, row: T, onConflict: string): Promise<void> {
    const response = await fetch(`${this.baseUrl(table)}?on_conflict=${encodeURIComponent(onConflict)}`, {
      method: 'POST',
      headers: this.headers('resolution=merge-duplicates,return=minimal'),
      body: JSON.stringify(row)
    });

    await assertOk(response, 'Supabase 更新失败');
  }

  async update<T extends Record<string, unknown>>(table: string, row: T, filters: Record<string, string>): Promise<void> {
    const query = this.filterQuery(filters);
    const response = await fetch(`${this.baseUrl(table)}?${query}`, {
      method: 'PATCH',
      headers: this.headers('return=minimal'),
      body: JSON.stringify(row)
    });

    await assertOk(response, 'Supabase PATCH 失败');
  }

  async selectOne<T extends Record<string, unknown>>(table: string, select: string, filters: Record<string, string>): Promise<T | null> {
    const query = [`select=${encodeURIComponent(select)}`, this.filterQuery(filters)].filter(Boolean).join('&');
    const response = await fetch(`${this.baseUrl(table)}?${query}`, {
      method: 'GET',
      headers: {
        apikey: this.config.anonKey,
        Authorization: `Bearer ${this.config.anonKey}`,
        Accept: 'application/json'
      }
    });

    await assertOk(response, 'Supabase 查询失败');
    const rows = await response.json() as T[];
    return rows[0] || null;
  }

  private baseUrl(table: string): string {
    return `${this.config.url.replace(/\/$/, '')}/rest/v1/${table}`;
  }

  private headers(prefer: string): HeadersInit {
    return {
      apikey: this.config.anonKey,
      Authorization: `Bearer ${this.config.anonKey}`,
      'Content-Type': 'application/json',
      Prefer: prefer
    };
  }

  private filterQuery(filters: Record<string, string>): string {
    return Object.entries(filters)
      .map(([key, value]) => `${encodeURIComponent(key)}=eq.${encodeURIComponent(value)}`)
      .join('&');
  }
}

async function assertOk(response: Response, prefix: string): Promise<void> {
  if (response.ok) return;
  let detail = '';
  try {
    detail = await response.text();
  } catch {
    detail = '';
  }
  throw new Error(`${prefix}：${response.status}${detail ? ` ${detail.slice(0, 180)}` : ''}`);
}
