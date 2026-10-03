import * as fs from "fs";
import * as path from "path";
import { LoopResult } from "./loop";

export interface EvidenceBundle extends LoopResult {
  alertTitle: string;
  at: string;
}

// Writes the evidence bundle next to the CLI output (JSON, secret-free).
export function writeEvidence(result: LoopResult, alertTitle: string, outDir = "evidence"): string {
  const bundle: EvidenceBundle = { ...result, alertTitle, at: new Date().toISOString() };
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `nightcall-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(bundle, null, 2));
  return file;
}
