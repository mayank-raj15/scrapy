const axios = require("axios");
const cheerio = require("cheerio");
const { getFinalHtml } = require("../utils/webUtils");

const MYNTRA_URL = "https://www.myntra.com";
const SPONSORED_TEXT = "ad";

// Utility functions
function generateRandomString(length) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Extract product information from the URL using regular expressions
function extractFromUrl(url) {
  const urlParts = url.split("/");

  const productCategory = urlParts[3]; // Extract product category
  const companyName = urlParts[4].replaceAll("+", " "); // Convert '+' to spaces
  const productName = urlParts[5].replaceAll(/-/g, " "); // Replace '-' with spaces
  const productId = urlParts[6]; // Extract product ID

  const sizeMatch = productName.match(/(\d+(\.\d+)?\s*(g|ml|l|L))/i);
  const size = sizeMatch ? sizeMatch[0] : "Unknown size";

  return {
    product_category: productCategory,
    company_name: companyName,
    product_name: productName,
    size: size,
    product_id: productId,
  };
}

// // Make a request to fetch the HTML page content
// async function fetchPageContent(url) {
//   try {
//     const response = await axios.get(url);
//     return response.data;
//   } catch (error) {
//     console.log(`Failed to retrieve page. Error: ${error}`);
//     return null;
//   }
// }

// // Parse the page content and extract additional details like price
// function parsePageContent(htmlContent) {
//   const $ = cheerio.load(htmlContent);

//   const price = $(".pdp-price").text().trim() || "Price not found";

//   return { price };
// }

// // Main function to extract product info from the URL and optionally fetch page content
// async function extractProductInfo(url) {
//   const productInfo = extractFromUrl(url);

//   const htmlContent = await fetchPageContent(url);
//   if (htmlContent) {
//     const pageInfo = parsePageContent(htmlContent);
//     Object.assign(productInfo, pageInfo);
//   }

//   return productInfo;
// }

// // Loop through each URL and extract product information
// function getInfoFromUrls(urls = []) {
//   urls.forEach((url) => {
//     const productInfo = extractFromUrl(url);
//     console.log("\nExtracted Product Information:");
//     for (const [key, value] of Object.entries(productInfo)) {
//       console.log(`${key}: ${value}`);
//     }
//   });
// }

// Shorten Myntra URL
function shortenMyntraUrl(fullUrl) {
  const urlParts = fullUrl.split("/");

  if (urlParts.includes("buy")) {
    const buyIndex = urlParts.indexOf("buy");
    const uniqueId = urlParts[buyIndex - 1];
    const shortenedUrl = `${MYNTRA_URL}/${uniqueId}`;
    return { uniqueId, shortenedUrl };
  }
  return { uniqueId: null, shortenedUrl: null };
}

function getImportantImages(images = []) {
  return images.filter(
    ({ view }) => view === "default" || view === "front" || view === "back"
  );
}

// Get details of products
function getDetails(
  links = [],
  names = [],
  prices = [],
  ratings = [],
  images = []
) {
  const products = links.map((link, i) => {
    const { uniqueId, shortenedUrl } = shortenMyntraUrl(link);
    return {
      store: "myntra",
      name: names[i],
      spid: uniqueId,
      url: shortenedUrl,
      image: images[i],
      price: prices[i],
      rating: ratings[i],
    };
  });
  return products;
}

// Fetch search results from Myntra
async function getMyntraSearchResults(query, numResults = 10) {
  const headers = {
    "User-Agent": generateRandomString(20),
  };

  query = query.replaceAll(" ", "-");
  const searchUrl = `${MYNTRA_URL}/${query}`;
  console.log(searchUrl);

  const { htmlContent, preloadedState } = await getFinalHtml(searchUrl);

  const { products = [] } = preloadedState?.searchData?.results;

  const results = products.map(
    ({
      landingPageUrl,
      productId,
      productName,
      rating,
      ratingCount,
      discount,
      brand,
      searchImage,
      inventoryInfo,
      sizes,
      images,
      gender,
      primaryColour,
      additionalInfo,
      category,
      mrp,
      price,
      articleType,
      subCategory,
      masterCategory,
    }) => ({
      landingPageUrl,
      productId,
      productName,
      rating: Math.round(rating * 10) / 10,
      ratingCount,
      discount,
      brand,
      searchImage,
      packSize: inventoryInfo?.at(0)?.brandSizeLabel ?? null,
      sizes,
      images: getImportantImages(images),
      gender,
      primaryColour,
      additionalInfo,
      category,
      mrp,
      price,
      articleType: articleType.typeName,
      subCategory: subCategory.typeName,
      masterCategory: masterCategory.typeName,
    })
  );

  if (results.length > 0) {
    return results.length > numResults ? results.slice(0, numResults) : results;
  }

  const $ = cheerio.load(htmlContent);

  const productLinks = [];
  const productNames = [];
  const productPrices = [];
  const productRatings = [];
  const productImages = [];

  $(".results-base .product-base").each((i, item) => {
    const isSponsored =
      $(item).find(".product-waterMark").text().toLowerCase() ===
      SPONSORED_TEXT;
    if (isSponsored) return;

    const linkArea = $(item).find("a");
    const linkHref = linkArea.attr("href");

    const imageArea = $(item).find(".product-imageSliderContainer picture img");
    const image = imageArea.attr("src");
    const name = imageArea.attr("title");

    const rating = $(item).find(".product-ratingsContainer span").text();
    const price =
      $(item)
        ?.find(
          ".product-productMetaInfo .product-price .product-discountedPrice"
        )
        ?.text()
        ?.replaceAll(",", "") ?? null;

    if (!linkHref || !image || !price || !name) return;

    productLinks.push(`${MYNTRA_URL}/${linkHref}`);
    productNames.push(name);
    productPrices.push(price);
    productRatings.push(rating);
    productImages.push(image);

    if (productLinks.length >= numResults) return false;
  });

  return getDetails(
    productLinks,
    productNames,
    productPrices,
    productRatings,
    productImages
  );
}

// Myntra
exports.myntra = async (query = "", numResults = 3) => {
  const products = await getMyntraSearchResults(query, numResults);

  return products;
};
