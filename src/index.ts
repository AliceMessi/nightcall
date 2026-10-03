import * as fs from "fs";
import * as path from "path";
import { runLoop, Alert } from "./loop";
import { writeEvidence } from "./evidence";

export { runLoop };

// CLI: node dist/src/index.js --alert fixture/alert.json
async function main() {
  const args = process.argv.slice(2);
  const get = (k: string) => {
    const i = args.indexOf(`--${k}`);
    return i >= 0 ? args[i + 1] ?? "" : "";
  };
  const alertPath = get("alert") || "fixture/alert.json";
  const raw = fs.readFileSync(alertPath, "utf8");
  const alert = JSON.parse(raw) as Alert;
  if (!path.isAbsolute(alert.fixtureDir)) {
    const fromCwd = path.join(process.cwd(), alert.fixtureDir);
    const fromAlert = path.join(path.dirname(alertPath), alert.fixtureDir);
    alert.fixtureDir = fs.existsSync(fromCwd) ? fromCwd : fromAlert;
  }
  const result = await runLoop(alert);
  const file = writeEvidence(result, alert.title);
  console.log(JSON.stringify({ ...result, evidence: file }, null, 2));
}

if (require.main === module) {
  main();
}
