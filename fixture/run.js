// Fixture gate: exits non-zero while the bug is present (red), 0 when fixed (green).
const assert = require("assert");
const { total } = require("./pricing");

const items = [
  { price: 10, qty: 2 },
  { price: 5, qty: 1 },
];
assert.strictEqual(total(items, 5), 20, "order total should be 20");
console.log("fixture green: total=20");
