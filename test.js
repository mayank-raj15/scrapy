const { nykaa } = require("./nykaa"); // Assuming `nykaa.js` has an exported function `nykaa`
const { amazon } = require("./amazon"); // Assuming `amazon.js` has an exported function `amazon`
const { myntra } = require("./myntra"); // Assuming `myntra.js` has an exported function `myntra`

async function main() {
  query = "dabur almond hair oil";
  query = query.toLowerCase();

  const startTime = new Date();

  // Replace this with the appropriate call based on the query
  const products = await amazon(query); // Assuming `nykaa` returns a promise

  const endTime = new Date();

  console.log(JSON.stringify(products, null, 4)); // Pretty-print the products JSON
  console.log("Start time: ", startTime);
  console.log("End time: ", endTime);
}

main();
