const { nykaa } = require("./nykaa");
const { appendToFile, readFromFile, writeToFile, jsonify } = require("./utils");

const STORE = "nykaa";
const PER_PAGE_COUNT = 20;
const MAX_PAGES = 500;

async function writeData(
  store = STORE,
  category,
  sortType = "desc",
  start = 1,
  end = 500,
  isLast = false
) {
  const { type, id } = category;
  const fileName = `${store}/${type}.json`;

  appendToFile(fileName, `    "${sortType}": [\n        `);

  let errorCount = 0;

  for (let i = start; i <= end; ) {
    let products;
    try {
      products = await nykaa("", i, `price_${sortType}`, category);
    } catch (err) {
      console.log(err);
      errorCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 21000));
      continue;
    }

    appendToFile(fileName, `${jsonify(products)}${i === end ? "" : ","}\n`);

    console.log(`Store: ${store}, Category: ${type}`);
    console.log(`Page completed: ${i}`);
    console.log(`Errors count: ${errorCount}`);

    i += 1;
  }

  appendToFile(fileName, `    ]${isLast ? "" : ","}\n`);
}

async function writeCategory(
  store = STORE,
  category = {
    type: "makeup",
    id: 12,
    count: 12763,
  },
  processed = { [STORE]: {} }
) {
  const { type, id, count } = category;
  const fileName = `${store}/${type}.json`;

  if (processed[store][id]?.includes("done")) {
    return;
  }

  const start = 1;
  let end = Math.ceil(count / PER_PAGE_COUNT);
  let middle = end;

  if (end > MAX_PAGES) {
    middle = MAX_PAGES;
  }

  console.log(
    `Type: ${type} - Start: ${start}, Middle: ${middle}, End: ${end}`
  );

  if (!processed[store][id]?.includes("desc")) {
    appendToFile(fileName, "{\n");
    await writeData(store, category, "desc", start, middle, end <= MAX_PAGES);
    processed[store][id] = ["desc"];
    writeToFile("processed.json", jsonify(processed));
    appendToFile("done.txt", `${store} ${type} desc\n`);
  }

  if (end > MAX_PAGES) {
    await writeData(store, category, "asc", 1, end - middle, true);
    processed[store][id].push("asc");
    writeToFile("processed.json", jsonify(processed));
    appendToFile("done.txt", `${store} ${type} asc\n`);
  }

  appendToFile(fileName, "}\n");

  processed[store][id].push("done");
  writeToFile("processed.json", jsonify(processed));

  console.log(`Category written! - Store: ${store}, Category: ${type}`);
}

async function main() {
  const startTime = new Date();

  const categories = readFromFile("categories.json");

  for (let i = 0; i < categories[STORE].length; i += 1) {
    const category = categories[STORE][i];
    const processed = readFromFile("processed.json");

    const { type, id } = category;
    console.log("Starting the category: ", type);
    console.log(processed);

    if (processed[STORE][id]?.length === 2) continue;

    await writeCategory(STORE, category, processed);

    console.log("Processed category: ", type);
  }

  const endTime = new Date();

  console.log("Start time: ", startTime);
  console.log("End time: ", endTime);
}

async function readData() {
  const data = readFromFile("nykaa/skin.json");
  let { asc, desc } = data;
  desc = desc.flat();
  asc = asc.flat().reverse();
  writeToFile("refined/nykaa_skin.json", jsonify([...desc, ...asc]));
}

readData();
// main();
