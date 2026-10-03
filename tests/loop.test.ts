import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { parseJson, heuristicTriage, fixtureFallbackDiagnosis, runLoop } from "../src/loop";
import { modelFor } from "../src/nebius";
import { runFixtureTest } from "../src/sandbox";

const REPO_FIXTURE = path.join(__dirname, "..", "fixture");

function copyFixture(): string {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nightcall-"));
  for (const f of fs.readdirSync(REPO_FIXTURE)) {
    fs.copyFileSync(path.join(REPO_FIXTURE, f), path.join(tmp, f));
  }
  return tmp;
}

describe("tier routing", () => {
  test("Nano for triage, Ultra for reasoning", () => {
    expect(modelFor("triage")).toContain("Nano-30B");
    expect(modelFor("reasoning")).toContain("Ultra");
    expect(modelFor("triage", "custom/model")).toBe("custom/model");
  });
});

describe("parsers", () => {
  test("extracts JSON from prose", () => {
    const t = parseJson<{ severity: string }>('analysis done {"severity":"P1"} ok');
    expect(t.severity).toBe("P1");
  });
  test("heuristic triage flags crash as P1", () => {
    expect(heuristicTriage({ title: "checkout 500 crash", fixtureDir: "." }).severity).toBe("P1");
  });
  test("fixture fallback names the off-by-one", () => {
    const d = fixtureFallbackDiagnosis(copyFixture());
    expect(d.oldText).toContain("<=");
    expect(d.newText).toContain("<");
  });
});

describe("loop on fixture (offline)", () => {
  test("red → patch → green, fixed:true", async () => {
    const dir = copyFixture();
    const before = await runFixtureTest(dir);
    expect(before.ok).toBe(false);
    const res = await runLoop({
      title: "P1 checkout 500s",
      stack: "TypeError reading 'price'",
      fixtureDir: dir,
    });
    expect(res.reproduced).toBe(true);
    expect(res.fixed).toBe(true);
    expect(res.mode).toBe("heuristic");
  }, 60000);
});
