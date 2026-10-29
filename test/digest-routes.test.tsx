import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Night } from '../src/digest/types.js';

let dir: string;
let app: ReturnType<typeof createApp>;

const line = (job: string, status: string, at: string) => JSON.stringify({ at, job, status, owner: null });

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'rig-'));
  writeFileSync(
    join(dir, '2030-01-01.jsonl'),
    [
      line('zeta', 'ok', '2030-01-01T01:00:00+01:00'),
      line('alpha', 'retry', '2030-01-01T02:00:00+01:00'),
      line('alpha', 'ok', '2030-01-01T02:05:00+01:00'),
      'not json at all',
      '',
    ].join('\n'),
  );
  writeFileSync(join(dir, '2030-01-02.jsonl'), '');
  app = createApp({ adapter: 'shim', installed: 'x', beatEverySeconds: 60, runsDir: dir });
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('digest routes', () => {
  it('serves page and JSON with 200 for a night with a file', async () => {
    const page = await app.request('/digest/2030-01-01');
    const api = await app.request('/api/digest/2030-01-01');
    expect(page.status).toBe(200);
    expect(api.status).toBe(200);
    expect(await page.text()).toContain('alpha');
  });

  it('answers 404 on both routes for a night with no file', async () => {
    const page = await app.request('/digest/2030-02-02');
    const api = await app.request('/api/digest/2030-02-02');
    expect(page.status).toBe(404);
    expect(api.status).toBe(404);
    expect(await page.text()).toContain('no run log for this night');
    expect(await api.json()).toEqual({ error: 'no such night', night: '2030-02-02' });
  });

  it('shows an empty night as nothing ran', async () => {
    const page = await app.request('/digest/2030-01-02');
    const api = await app.request('/api/digest/2030-01-02');
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('nothing ran');
    const body = (await api.json()) as Night;
    expect(body.rows).toEqual([]);
    expect(body.badLines).toBe(0);
  });

  it('reports a bad line and keeps the other rows', async () => {
    const page = await (await app.request('/digest/2030-01-01')).text();
    const body = (await (await app.request('/api/digest/2030-01-01')).json()) as Night;
    expect(page).toContain('1 line could not be read');
    expect(body.badLines).toBe(1);
    expect(body.rows.map((r) => r.job)).toEqual(['alpha', 'zeta']);
  });

  it('lists the same jobs in the same order on page and JSON', async () => {
    const page = await (await app.request('/digest/2030-01-01')).text();
    const body = (await (await app.request('/api/digest/2030-01-01')).json()) as Night;
    const inPage = [...page.matchAll(/<tr><td>([^<]+)<\/td>/g)].map((m) => m[1]);
    expect(inPage).toEqual(body.rows.map((r) => r.job));
    expect(inPage).toEqual(['alpha', 'zeta']);
  });
});
