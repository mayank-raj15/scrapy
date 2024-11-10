async function minify() {
  const content = fs.readFileSync("fixed_data.csv", "utf-8");
  const rows = content.split("\n");
  console.log(new Date());

  for (let i = 0; i < rows.length; i += 1) {
    if (!rows[i]) continue;
    let items = rows[i].split(",");
    const lessItems = i === 0 ? ["id"] : [`${i}`];
    if (items.length === 7) {
      lessItems.push(items[0], items[3], items[6]);
    }
    const finalRow = lessItems.join(",");
    appendToFile("minified.csv", `${finalRow}\n`);
  }

  console.log(new Date());
}

async function fixPriceInData() {
  // const pds = await myntra("head and shoulders anti hairfall shampoo");
  // console.log(pds);

  const content = fs.readFileSync("name_data.csv", "utf-8");
  const rows = content.split("\n");
  console.log(new Date());

  for (let i = 0; i < rows.length; i += 1) {
    if (!rows[i]) continue;
    let items = rows[i].split(",");
    let finalRow = null;

    if (items.length > 7) {
      const initial = items.splice(0, 4);
      const otherIndex = items.length - 2;
      const middle = [items.splice(0, otherIndex).join("")];
      const end = items;

      finalRow = [...initial, ...middle, ...end].join(",");
    } else {
      finalRow = rows[i];
    }

    appendToFile("fixed_data.csv", `${finalRow}\n`);
  }
  console.log(new Date());
}

// creates model data with names and verdict
async function createModelData() {
  console.log(new Date());
  // get data
  const wholeData = fs.readFileSync("minified.csv", "utf-8");
  const verdictData = fs.readFileSync("verdict.csv", "utf-8");
  const wholeRows = wholeData.split("\n");
  const verdictRows = verdictData.split("\n");

  // create a map for each id to it's data
  const idMap = new Map();
  for (let i = 0; i < wholeRows.length; i += 1) {
    const rowItems = wholeRows[i].split(",") ?? [];
    if (rowItems.length === 4) {
      const id = parseInt(rowItems[0]);
      const name1 = rowItems[1];
      const name2 = rowItems[2];
      idMap.set(id, { name1, name2 });
    }
  }

  // loop through the verdict id's and get the names of the ids
  // and create a csv row and append
  for (let i = 0; i < verdictRows.length; i += 1) {
    const rowItems = verdictRows[i].split(",") ?? [];
    if (rowItems.length === 2) {
      const id = parseInt(rowItems[0]);
      const verdict = rowItems[1];
      const { name1, name2 } = idMap.get(id);
      appendToFile("modelData.csv", `${name1},${name2},${verdict}\n`);
    }
  }

  console.log(new Date());
}

const getCompany = (url = "") => {
  if (url.includes("amazon.in")) {
    return "amazon";
  } else if (url.includes("myntra.com")) {
    return "myntra";
  }
};

async function getModelDataWithRank() {
  console.log(new Date());
  // get data
  const wholeData = fs.readFileSync("minified_ranked.csv", "utf-8");
  const verdictData = fs.readFileSync("verdict.csv", "utf-8");
  const wholeRows = wholeData.split("\n");
  const verdictRows = verdictData.split("\n");

  // create a map for each id to it's data
  const idMap = new Map();
  for (let i = 0; i < wholeRows.length; i += 1) {
    const rowItems = wholeRows[i].split(",") ?? [];
    if (rowItems.length === 5) {
      const id = parseInt(rowItems[0]);
      const name1 = rowItems[1];
      const name2 = rowItems[2];
      const rank = rowItems[4];
      idMap.set(id, { name1, name2, rank });
    }
  }

  // loop through the verdict id's and get the names of the ids
  // and create a csv row and append
  for (let i = 0; i < verdictRows.length; i += 1) {
    const rowItems = verdictRows[i].split(",") ?? [];
    if (rowItems.length === 2) {
      const id = parseInt(rowItems[0]);
      const verdict = rowItems[1];
      const { name1, name2, rank } = idMap.get(id);
      appendToFile(
        "modelDataRanked.csv",
        `${name1},${name2},${rank},${verdict}\n`
      );
    }
  }

  console.log(new Date());
}

async function minifyDataWithRank() {
  const wholeData = fs.readFileSync("fixed_data.csv", "utf-8");
  const dataRows = wholeData.split("\n");
  console.log(new Date());
  let prevMyntraUrl = "";
  let prevUrl = "";
  let rank = 1;
  for (let i = 1; i < dataRows.length; i += 1) {
    const items = dataRows[i].split(",");
    const myntraUrl = items[2];
    const otherUrl = items[5];
    const lessItems = [`${i}`];
    if (items.length === 7) {
      if (prevMyntraUrl === myntraUrl) {
        if (getCompany(prevUrl) === getCompany(otherUrl)) {
          rank += 1;
        } else {
          rank = 1;
        }
      } else {
        rank = 1;
        prevMyntraUrl = myntraUrl;
      }
      prevUrl = otherUrl;
      lessItems.push(items[0], items[3], items[6], rank);
    }
    const finalRow = lessItems.join(",");
    appendToFile("minified_ranked.csv", `${finalRow}\n`);
  }
  console.log(new Date());
}

const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
};

// creates dataset with similar no of same & different match counts
async function createValidDataSet() {
  console.log(new Date());
  const data = fs.readFileSync("modelData.csv", "utf-8");
  const same = [];
  const different = [];
  const dataRows = data.split("\n");
  for (let i = 1; i < dataRows.length; i += 1) {
    const rowItems = dataRows[i].split(",");
    if (!rowItems[2]) {
      console.log(rowItems);
    }
    if (rowItems[2]?.startsWith("same")) {
      same.push(dataRows[i]);
    } else if (rowItems[2]?.startsWith("different")) {
      different.push(dataRows[i]);
    }
  }

  shuffleArray(same);
  shuffleArray(different);
  const updatedRows = [...same, ...different.slice(0, same.length)];
  shuffleArray(updatedRows);

  for (let i = 0; i < updatedRows.length; i += 1) {
    appendToFile("cleanModelData.csv", `${updatedRows[i]}\n`);
  }
  console.log(new Date());
}

// creates dataset with similar no of same & different match counts
async function createValidRankedDataSet() {
  console.log(new Date());
  const data = fs.readFileSync("modelDataRanked.csv", "utf-8");
  const same = [];
  const different = [];
  const dataRows = data.split("\n");
  for (let i = 1; i < dataRows.length; i += 1) {
    const rowItems = dataRows[i].split(",");
    if (!rowItems[3]) {
      console.log(rowItems);
    }
    if (rowItems[3]?.startsWith("same")) {
      same.push(dataRows[i]);
    } else if (rowItems[3]?.startsWith("different")) {
      different.push(dataRows[i]);
    }
  }

  shuffleArray(same);
  shuffleArray(different);
  const updatedRows = [...same, ...different.slice(0, same.length * 1.25)];
  shuffleArray(updatedRows);

  console.log(updatedRows.length);
  for (let i = 0; i < updatedRows.length; i += 1) {
    appendToFile("cleanModelDataRanked.csv", `${updatedRows[i]}\n`);
  }
  console.log(new Date());
}
