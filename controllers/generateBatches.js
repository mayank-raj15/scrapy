const { shuffleArray } = require("../utils/commonUtils");
const {
  readFromFile,
  appendToFile,
  writeToFile,
} = require("../utils/fileUtils");

async function createBatches(count = 10000, batchSize = 200) {
  const wholeData = fs.readFileSync("rawData/fixed_data.csv", "utf-8");
  const skipIds = readFromFile("rawData/batches/done.json");
  const dataRows = wholeData.split("\n");
  console.log(new Date());

  const set = new Set(dataRows.map((_, i) => i));
  for (let i = 0; i < skipIds.length; i += 1) {
    set.delete(0);
    if (set.has(parseInt(skipIds[i]))) {
      set.delete(parseInt(skipIds[i]));
    }
  }

  let remaining = [...set];
  shuffleArray(remaining);
  shuffleArray(remaining);
  shuffleArray(remaining);

  remaining = remaining.slice(0, count);
  const doneIds = [...skipIds, ...remaining];
  let batchCount = 1;
  let currentBatchCount = 0;
  for (let i = 0; i < remaining.length; i += 1) {
    const index = remaining[i];
    if (!dataRows[index]) continue;
    let items = dataRows[index].split(",");
    const lessItems = [`${index}`];
    if (items.length === 7) {
      lessItems.push(items[0], items[3], items[6]);
      const finalRow = lessItems.join(",");
      appendToFile(`rawData/batches/batch-${batchCount}.csv`, `${finalRow}\n`);
      currentBatchCount += 1;
    }
    if (currentBatchCount === batchSize) {
      batchCount += 1;
      currentBatchCount = 0;
    }
  }

  writeToFile("rawData/batches/done.json", jsonify(doneIds));

  console.log(new Date());
}
