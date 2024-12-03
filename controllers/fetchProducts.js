const { STORE, PER_PAGE_COUNT, MAX_PAGES } = require("../utils/constants");
const { nykaa } = require("../storeDataFetchers/nykaa");
const {
  readFromFile,
  appendToFile,
  writeToFile,
  jsonify,
} = require("../utils/fileUtils");

const PROCESSED_FILE_PATH = "structuralData/processed.json";
const CATEGORIES_FILE_PATH = "structuralData/categories.json";
const DONE_FILE_PATH = "structuralData/done.txt";

const getProductsFilePath = (store = STORE, type = "beauty") =>
  `products/${store}/${type}.json`;

const getRefinedProductsFilePath = (store = STORE, type = "beauty") =>
  `products/${store}/refined_${type}.json`;

async function writeData(
  store = STORE,
  category,
  sortType = "price_desc",
  start = 1,
  end = 500,
  isLast = false
) {
  const { type, id } = category;
  const fileName = getProductsFilePath(store, type);

  appendToFile(fileName, `    "${sortType}": [\n        `);

  let errorCount = 0;

  for (let i = start; i <= end; ) {
    let products;
    try {
      products = await nykaa("", i, sortType, category, store);
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
  sortType = "popularity",
  processed = { [STORE]: {} }
) {
  const { type, id, count } = category;
  const fileName = getProductsFilePath(store, type);

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

  if (!processed[store][id]?.includes(sortType)) {
    appendToFile(fileName, "{\n");
    await writeData(
      store,
      category,
      sortType,
      start,
      middle,
      true
      //   end <= MAX_PAGES
    );
    processed[store][id] = [sortType];
    writeToFile(PROCESSED_FILE_PATH, jsonify(processed));
    appendToFile(DONE_FILE_PATH, `${store} ${type} ${sortType}\n`);
  }

  //   if (!processed[store][id]?.includes("desc")) {
  //     appendToFile(fileName, "{\n");
  //     await writeData(store, category, "desc", start, middle, end <= MAX_PAGES);
  //     processed[store][id] = ["desc"];
  //     writeToFile(PROCESSED_FILE_PATH, jsonify(processed));
  //     appendToFile(DONE_FILE_PATH, `${store} ${type} desc\n`);
  //   }

  //   if (end > MAX_PAGES) {
  //     await writeData(store, category, "asc", 1, end - middle, true);
  //     processed[store][id].push("asc");
  //     writeToFile(PROCESSED_FILE_PATH, jsonify(processed));
  //     appendToFile(DONE_FILE_PATH, `${store} ${type} asc\n`);
  //   }

  appendToFile(fileName, "}\n");

  processed[store][id].push("done");
  writeToFile(PROCESSED_FILE_PATH, jsonify(processed));

  console.log(`Category written! - Store: ${store}, Category: ${type}`);
}

function refineData(store = STORE, type = "skin") {
  const data = readFromFile(getProductsFilePath(store, type));
  let { asc, desc, popularity } = data;
  if (!desc) {
    desc = [];
  }
  if (!asc) {
    asc = [];
  }
  if (!popularity) {
    popularity = [];
  }
  desc = desc.flat();
  asc = asc.flat().reverse();
  popularity = popularity.flat();

  writeToFile(
    getRefinedProductsFilePath(store, type),
    jsonify([...popularity, ...desc, ...asc])
  );
}

exports.getProducts = async (sortType = "popularity", usage = "write") => {
  const startTime = new Date();

  const categories = readFromFile(CATEGORIES_FILE_PATH);

  for (let i = 0; i < categories[STORE].length; i += 1) {
    const category = categories[STORE][i];
    const processed = readFromFile(PROCESSED_FILE_PATH);

    const { type, id } = category;
    console.log("Starting the category: ", type);

    switch (usage) {
      case "write":
        if (!processed[STORE][id]?.includes("done")) {
          await writeCategory(STORE, category, sortType, processed);
        }
        break;
      case "refine":
        refineData(STORE, type);
        break;
      default:
        console.log("not here son!");
    }

    console.log("Processed category: ", type);
    refineData(STORE, type);
  }

  const endTime = new Date();

  console.log("Start time: ", startTime);
  console.log("End time: ", endTime);
};
