import { execFile, ExecFileException } from "child_process";
import * as path from "path";

export interface RunResult {
  ok: boolean;
  exitCode: number;
  log: string;
  ms: number;
}

const TIMEOUT_MS = 30000;

// Local sandbox runner: executes only files inside the fixture dir, no network.
export function runFixtureTest(fixtureDir: string, script = "run.js"): Promise<RunResult> {
  const abs = path.resolve(fixtureDir);
  const target = path.join(abs, script);
  if (!target.startsWith(abs)) return Promise.reject(new Error("Sandbox escape denied"));
  const started = Date.now();
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [target],
      { cwd: abs, timeout: TIMEOUT_MS, windowsHide: true },
      (err: ExecFileException | null, stdout: string, stderr: string) => {
        const log = `--- stdout ---\n${stdout}\n--- stderr ---\n${stderr}`;
        if (err) {
          const code = typeof err.code === "number" ? err.code : 1;
          resolve({ ok: false, exitCode: code, log, ms: Date.now() - started });
        } else {
          resolve({ ok: true, exitCode: 0, log, ms: Date.now() - started });
        }
      }
    );
  });
}
