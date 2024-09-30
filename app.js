const { nykaa } = require("./nykaa");
const { appendToFile, readFromFile, writeToFile, jsonify } = require("./utils");

async function main() {
  const startTime = new Date();
  let errorCount = 0;
  const firstTime = false;

  if (firstTime) {
    appendToFile("nykaa_skin", "[\n", true);
  }

  for (let i = 159; i <= 243; ) {
    let products;
    try {
      products = await nykaa("", i, "price_asc");
    } catch (err) {
      console.log(err);
      errorCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 61000));
      continue;
    }

    console.log(products);
    appendToFile("nykaa_skin");
    console.log(`Page completed: ${i}`);
    console.log(`Errors count: ${errorCount}`);
    i += 1;
  }

  const endTime = new Date();

  if (firstTime) {
    appendToFile("nykaa_skin", "]", true);
  }

  console.log("Start time: ", startTime);
  console.log("End time: ", endTime);
}

async function readData() {
  const data = readFromFile("nykaa_skin.json");
  let { asc, desc } = data;
  desc = desc.flat();
  asc = asc.flat().reverse();
  writeToFile("nykaa_skin_pd.json", jsonify([...desc, ...asc]));
}

readData();
