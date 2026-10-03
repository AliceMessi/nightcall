import * as fs from "fs";
import * as path from "path";
import { callNemotron } from "./nebius";
import { runFixtureTest, RunResult } from "./sandbox";

export interface Alert {
  title: string;
  stack?: string;
  endpoint?: string;
  fixtureDir: string;
  testScript?: string;
}

export interface Triage {
  severity: "P1" | "P2" | "P3";
  area: string;
}

export interface Diagnosis {
  rootCause: string;
  file: string;
  oldText: string;
  newText: string;
}

export interface LoopResult {
  reproduced: boolean;
  fixed: boolean;
  triage: Triage;
  diagnosis: Diagnosis;
  reproLog: string;
  verifyLog: string;
  mode: "nemotron" | "heuristic-fallback" | "heuristic";
  models: string[];
}

const TRIAGE_SYSTEM = `You are Nightcall triage, an on-call engineer. Reply strict JSON only: {"severity":"P1"|"P2"|"P3","area":string}. P1 = crash/data-loss/payment.`;
const DIAG_SYSTEM = `You are Nightcall root-cause analyst. Given alert + failing log + source, reply strict JSON only: {"rootCause":string,"file":string,"oldText":string,"newText":string}. oldText must be an exact substring of the file. Minimal fix only.`;

export function parseJson<T>(raw: string): T {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("No JSON in model output");
  return JSON.parse(raw.slice(start, end + 1)) as T;
}

export function heuristicTriage(a: Alert): Triage {
  const t = `${a.title} ${a.stack ?? ""}`.toLowerCase();
  if (/crash|data loss|payment|500|down/i.test(t)) return { severity: "P1", area: "payments/api" };
  if (/timeout|slow|leak|retry/i.test(t)) return { severity: "P2", area: "backend" };
  return { severity: "P3", area: "general" };
}

// Deterministic fallback for the fixture: known seeded bug.
export function fixtureFallbackDiagnosis(fixtureDir: string): Diagnosis {
  const file = path.join(path.resolve(fixtureDir), "pricing.js");
  const src = fs.readFileSync(file, "utf8");
  const oldText = "i <= items.length";
  if (!src.includes(oldText)) throw new Error("Fixture bug already fixed or unexpected");
  return {
    rootCause: "Off-by-one: loop reads one past the end (items[items.length] is undefined) and crashes.",
    file,
    oldText,
    newText: "i < items.length",
  };
}

function applyPatch(d: Diagnosis): void {
  const abs = path.resolve(d.file);
  const src = fs.readFileSync(abs, "utf8");
  if (!src.includes(d.oldText)) throw new Error("Patch target not found");
  fs.writeFileSync(abs, src.replace(d.oldText, d.newText));
}

export async function runLoop(alert: Alert): Promise<LoopResult> {
  const models: string[] = [];
  const live = Boolean(process.env.NEBIUS_API_KEY);
  let triage: Triage;
  let triageMode: LoopResult["mode"] = live ? "nemotron" : "heuristic";

  if (live) {
    try {
      const { text, model } = await callNemotron(
        [
          { role: "system", content: TRIAGE_SYSTEM },
          { role: "user", content: JSON.stringify({ title: alert.title, stack: alert.stack ?? "", endpoint: alert.endpoint ?? "" }) },
        ],
        "triage"
      );
      models.push(model);
      triage = parseJson<Triage>(text);
    } catch {
      triageMode = "heuristic-fallback";
      triage = heuristicTriage(alert);
    }
  } else {
    triage = heuristicTriage(alert);
  }

  const repro: RunResult = await runFixtureTest(alert.fixtureDir, alert.testScript ?? "run.js");
  const reproduced = !repro.ok;

  let diagnosis: Diagnosis;
  let mode: LoopResult["mode"] = triageMode;
  if (live && reproduced) {
    try {
      const file = path.join(path.resolve(alert.fixtureDir), "pricing.js");
      const code = fs.readFileSync(file, "utf8");
      const { text, model } = await callNemotron(
        [
          { role: "system", content: DIAG_SYSTEM },
          {
            role: "user",
            content: JSON.stringify({ alert: alert.title, stack: alert.stack ?? "", log: repro.log.slice(0, 2000), code: code.slice(0, 2000) }),
          },
        ],
        "reasoning",
        { maxTokens: 800 }
      );
      models.push(model);
      const d = parseJson<Diagnosis>(text);
      diagnosis = { ...d, file };
    } catch {
      mode = "heuristic-fallback";
      diagnosis = fixtureFallbackDiagnosis(alert.fixtureDir);
    }
  } else {
    diagnosis = fixtureFallbackDiagnosis(alert.fixtureDir);
  }

  if (reproduced) {
    applyPatch(diagnosis);
  }
  const verify = await runFixtureTest(alert.fixtureDir, alert.testScript ?? "run.js");

  return {
    reproduced,
    fixed: reproduced && verify.ok,
    triage,
    diagnosis,
    reproLog: repro.log,
    verifyLog: verify.log,
    mode,
    models,
  };
}
