// Plan morning-digest § 1. The contract every part of § 2 starts against: one row per job for a
// night, plus what the reader could not parse. Rows come sorted by job, so the page and the JSON
// show the same order (ADR 0001).

export type RunStatus = 'ok' | 'retry' | 'fail';

// One line of runs/<night>.jsonl, after parsing.
export type RunLine = {
  at: string;
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

export type DigestRow = {
  job: string;
  owner: string | null; // null renders as '—'
  runs: number; // parsed lines for this job
  retries: number; // lines with status 'retry'
  lastStatus: RunStatus;
  lastError: string | null; // error of the latest line that had one
  firstAt: string; // times keep the log's offset
  lastAt: string;
};

export type Night = {
  night: string; // YYYY-MM-DD
  rows: DigestRow[]; // sorted by job
  badLines: number; // lines that did not parse; counted, never thrown
  counts: Record<RunStatus, number>; // parsed lines per status, for the board
};

// Returns null when the night has no file (or is not a YYYY-MM-DD name). An empty file is a Night
// with no rows.
export type ReadNight = (runsDir: string, night: string) => Night | null;
