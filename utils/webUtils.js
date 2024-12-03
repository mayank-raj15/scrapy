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

  const htmlContent = await page.content();
  await browser.close();
  return { htmlContent, preloadedState };
};
