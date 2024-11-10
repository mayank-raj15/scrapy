const axios = require("axios");
const cheerio = require("cheerio");

// Utility function to generate a random string
function generateRandomString(length) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Function to shorten Amazon URL
function shortenAmazonUrl(fullUrl) {
  const urlParts = fullUrl.split("/");
  if (urlParts.includes("dp")) {
    const dpIndex = urlParts.indexOf("dp");
    const asin = urlParts[dpIndex + 1]; // ASIN comes right after 'dp'
    const shortenedUrl = `https://www.amazon.in/dp/${asin}`;
    return { asin, shortenedUrl };
  } else {
    return "Invalid URL";
  }
}

// Function to get product details
function getDetails(
  links = [],
  names = [],
  prices = [],
  ratings = [],
  images = []
) {
  const products = links.map((link, i) => {
    const { asin, shortenedUrl } = shortenAmazonUrl(link);
    return {
      store: "amazon",
      name: names[i],
      spid: asin,
      url: shortenedUrl,
      image: images[i],
      price: prices[i]?.price ?? null,
      mrp: prices[i]?.mrp ?? null,
      rating: ratings[i]?.rating,
      ratingCount: ratings[i]?.ratingCount,
    };
  });
  return products;
}

// Function to get Amazon search results
async function getAmazonSearchResults(query = "", numResults = 5) {
  const headers = {
    "User-Agent": generateRandomString(20),
  };

  // Format the search query for URL
  const searchQuery = query.replaceAll(" ", "+");

  // Construct the Amazon search URL
  const url = `https://www.amazon.in/s?k=${searchQuery}`;
  console.log(url);

  // Fetch the search results page
  try {
    const response = await axios.get(url, { headers });
    if (response.status !== 200) {
      console.log(
        `Failed to retrieve the webpage. Status code: ${response.status}`
      );
      return [];
    }

    const htmlContent = response.data;
    const $ = cheerio.load(htmlContent);

    // Parsing products
    const mainItems = $(".s-main-slot .s-result-item");
    let productLinks = [];
    let productNames = [];
    let productPrices = [];
    let productRatings = [];
    let productImages = [];

    // Loop through the product items and extract details
    mainItems.each((i, item) => {
      const priceArea = $(item).find("span.a-price-whole");
      const price = priceArea.text().trim().replaceAll(",", "");

      const mrpArea = $(item)
        .find('[data-cy="price-recipe"]')
        ?.find("a div span.a-price span.a-offscreen");
      let mrp = mrpArea?.text()?.trim();
      mrp = mrp ? mrp.replace("₹", "") : null;
      mrp = mrp ? mrp.replaceAll(",", "") : null;

      const ratingArea = $(item).find('[data-cy="reviews-ratings-slot"]');
      const ratingSpan = ratingArea.find("span");
      const rating = ratingSpan.text().trim();

      const ratingCountArea = $(item).find(
        'span[aria-label*="ratings"] a span.a-size-base'
      );
      let ratingCount = ratingCountArea?.text()?.replaceAll(",", "") ?? null;
      ratingCount = parseInt(ratingCount);

      const linkArea = $(item).find("h2 a");
      const href = linkArea.attr("href");
      const name = linkArea.find("span").text().trim();

      const imageArea = $(item).find(".s-product-image-container img");
      const image = imageArea.attr("src");

      if (href && href.startsWith("/sspa")) {
        // Skip sponsored products
        return;
      }

      if (href && price && name) {
        const fullLink = `https://www.amazon.in${href}`;
        productLinks.push(fullLink);
        productNames.push(name);
        productPrices.push({ price, mrp });
        productRatings.push({
          rating: rating.split(" ")[0] || null,
          ratingCount,
        });
        productImages.push(image);

        if (productLinks.length >= numResults) {
          return false; // Exit loop when enough results are found
        }
      }
    });

    return {
      productLinks,
      productNames,
      productPrices,
      productRatings,
      productImages,
    };
  } catch (error) {
    console.error("Error fetching Amazon search results:", error);
    return [];
  }
}

// Main Amazon function to search for products
exports.amazon = async (query = "", numResults = 3) => {
  const {
    productLinks,
    productNames,
    productPrices,
    productRatings,
    productImages,
  } = await getAmazonSearchResults(query, numResults);
  const products = getDetails(
    productLinks,
    productNames,
    productPrices,
    productRatings,
    productImages
  );
  return products;
};
