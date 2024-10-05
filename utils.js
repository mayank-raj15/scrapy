const { firefox } = require("playwright");
const crypto = require("crypto");
const fs = require("fs");

exports.jsonify = (data) => {
  return JSON.stringify(data, null, 4);
};

exports.writeToFile = (name, data) => {
  try {
    fs.writeFileSync(`./${name}`, data);
    console.log("File written successfully:", name);
  } catch (err) {
    console.error("Error writing to file: ", name, err);
  }
};

exports.appendToFile = (name, data) => {
  try {
    fs.appendFileSync(`./${name}`, data);
    console.log("Data appended successfully!:", name);
  } catch (err) {
    console.error("Error appending to file:", name, err);
  }
};

exports.readFromFile = (name) => {
  try {
    // Read the file content
    const fileContent = fs.readFileSync(`./${name}`, "utf-8");
    // Parse the content to JSON
    const jsonData = JSON.parse(fileContent);

    return jsonData;
  } catch (err) {
    console.error("Error reading or parsing the file:", err);
    throw err;
  }
};

exports.getDistinctIndices = (count, min, max) => {
  const randomNumbers = new Set();

  while (randomNumbers.size < count) {
    const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
    randomNumbers.add(randomNumber);
  }

  return Array.from(randomNumbers);
};

// Function to slugify a given text
function slugify(text) {
  // Convert to lowercase
  text = text.toLowerCase();

  // Replace special characters like '&' with words (e.g., 'and')
  text = text.replaceAll(/&/g, "and");

  // Replace spaces with hyphens
  text = text.replaceAll(/\s+/g, "-");

  // Remove any remaining non-alphanumeric characters (except hyphens)
  text = text.replaceAll(/[^a-z0-9\-]/g, "");

  return text;
}

// Function to normalize a string by removing special characters and extra spaces
exports.normalizeString = (inputString = "") => {
  // Remove special characters, keeping only alphanumeric and spaces
  const cleanedString = inputString.replaceAll(/[^a-zA-Z0-9\s]/g, "");

  // Remove extra spaces
  const normalizedString = cleanedString.trim().replaceAll(/\s+/g, " ");

  return normalizedString;
};

// Function to generate a random alphanumeric string of specified length
exports.generateRandomString = (length = 10) => {
  return crypto
    .randomBytes(length)
    .toString("base64")
    .slice(0, length)
    .replaceAll(/[^a-zA-Z0-9]/g, "");
};

// Function to get the final HTML from a URL, optionally scrolling
exports.getFinalHtml = async (
  url = "",
  scrollable = false,
  timeout = 7000,
  scrollTimeout = 100,
  scrollHeight = 200
) => {
  const browser = await firefox.launch({
    headless: true,
    args: ["--disable-http2"],
  });
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
  });

  await page.goto(url, { timeout });

  if (scrollable) {
    let currentHeight = 0;
    let previousHeight = await page.evaluate(() => document.body.scrollHeight);

    // Scroll the page down step-by-step
    while (true) {
      await page.mouse.wheel(0, scrollHeight); // Simulate mouse scroll
      currentHeight += scrollHeight;
      await page.waitForTimeout(scrollTimeout); // Pause for scroll timeout

      previousHeight = await page.evaluate(() => document.body.scrollHeight);

      // Exit loop when reaching the bottom of the page
      if (currentHeight >= previousHeight) {
        break;
      }
    }
  }

  let preloadedState;
  if (url.includes("nykaa")) {
    preloadedState = await page.evaluate(() => {
      return window.__PRELOADED_STATE__;
    });
  } else if (url.includes("myntra")) {
    preloadedState = await page.evaluate(() => {
      return window.__myx;
    });
  }

  // exports.writeToFile(
  //   "preload.json",
  //   exports.jsonify(preloadedState.categoryListing.listingData.products)
  // );

  const htmlContent = await page.content();
  await browser.close();
  return { htmlContent, preloadedState };
};
