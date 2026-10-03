// Fixture: order pricing with a seeded off-by-one (alert: checkout 500s).
function total(items, discount) {
  let sum = 0;
  for (let i = 0; i <= items.length; i++) {
    sum += items[i].price * items[i].qty;
  }
  return sum - discount;
}
module.exports = { total };
