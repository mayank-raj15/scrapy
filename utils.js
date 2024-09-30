const { firefox } = require("playwright");
const crypto = require("crypto");
const fs = require("fs");

exports.jsonify = (data) => {
  return JSON.stringify(data, null, 4);
};

exports.writeToFile = (name, data) => {
  fs.writeFile(`./${name}`, data, (err) => {
    if (err) {
      console.error("Error writing to file:", err);
    } else {
      console.log("File written successfully");
    }
  });
};

exports.appendToFile = (name, data) => {
  fs.appendFile(`./${name}`, data, (err) => {
    if (err) {
      console.error("Error appending to file:", err);
    } else {
      console.log("Data appended successfully!");
    }
  });
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

// Function to slugify a given text
function slugify(text) {
  // Convert to lowercase
  text = text.toLowerCase();

  // Replace special characters like '&' with words (e.g., 'and')
  text = text.replace(/&/g, "and");

  // Replace spaces with hyphens
  text = text.replace(/\s+/g, "-");

  // Remove any remaining non-alphanumeric characters (except hyphens)
  text = text.replace(/[^a-z0-9\-]/g, "");

  return text;
}

// Function to normalize a string by removing special characters and extra spaces
exports.normalizeString = (inputString = "") => {
  // Remove special characters, keeping only alphanumeric and spaces
  const cleanedString = inputString.replace(/[^a-zA-Z0-9\s]/g, "");

  // Remove extra spaces
  const normalizedString = cleanedString.trim().replace(/\s+/g, " ");

  return normalizedString;
};

// Function to generate a random alphanumeric string of specified length
exports.generateRandomString = (length = 10) => {
  return crypto
    .randomBytes(length)
    .toString("base64")
    .slice(0, length)
    .replace(/[^a-zA-Z0-9]/g, "");
};

// Function to get the final HTML from a URL, optionally scrolling
exports.getFinalHtml = async (
  url,
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

  const htmlContent = await page.content();
  await browser.close();
  return htmlContent;
};
