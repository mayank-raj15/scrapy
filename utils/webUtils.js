const { firefox } = require("playwright");

exports.getFinalHtml = async (
  url = "",
  scrollable = true,
  timeout = 8000,
  scrollTimeout = 100,
  scrollHeight = 200
) => {
  const browser = await firefox.launch({ headless: true });
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

  let preloadedState = null;
  try {
    if (url.includes("nykaa")) {
      preloadedState = await page.evaluate(() => window.__PRELOADED_STATE__);
    } else if (url.includes("myntra")) {
      preloadedState = await page.evaluate(() => window.__myx);
    }
  } catch (error) {
    console.error("Error accessing variables:", error);
  }

  if (!preloadedState) {
    const fullHTML = await page.content();
    const matches =
      fullHTML.match(/__PRELOADED_STATE__\s*=\s*(\{.*?\})(;|<)/) ||
      fullHTML.match(/__myx\s*=\s*(\{.*?\})(;|<)/);

    if (matches) {
      let jsonString = matches[1];
      try {
        // Clean and parse JSON
        jsonString = jsonString.replace(/;\s*$/, ""); // Remove trailing semicolon
        preloadedState = JSON.parse(jsonString);
      } catch (error) {
        console.error("Error parsing JSON:", error, jsonString);
      }
    } else {
      console.error("No matches found for preloaded state.");
    }
  }

  const htmlContent = await page.content();
  await browser.close();
  return { htmlContent, preloadedState };
};
