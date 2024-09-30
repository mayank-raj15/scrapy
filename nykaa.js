const axios = require("axios");
const cheerio = require("cheerio");
const url = require("url");
const { getFinalHtml, writeToFile } = require("./utils");

const NYKAA_URL = "https://www.nykaa.com";

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

function getSearchQuery(query = "") {
  return encodeURIComponent(query.toLowerCase());
}

function shortenNykaaUrl(fullUrl) {
  const mainUrl = fullUrl.split("?")[0];
  const urlParts = mainUrl.split("/");

  const pIndex = urlParts.indexOf("p");
  if (pIndex !== -1) {
    const pid = urlParts[pIndex + 1];
    return { pid, mainUrl };
  } else {
    return { pid: null, mainUrl: null };
  }
}

function getDetails(
  links = [],
  names = [],
  prices = [],
  ratings = [],
  images = []
) {
  const products = [];

  links.forEach((link, i) => {
    const { pid, mainUrl } = shortenNykaaUrl(link);
    products.push({
      store: "nykaa",
      name: names[i],
      spid: pid,
      url: mainUrl,
      image: images[i],
      price: prices[i]?.price ?? null,
      mrp: prices[i]?.mrp ?? null,
      rating: ratings[i],
    });
  });

  return products;
}

async function getNykaaSearchResults(
  query,
  page = 1,
  sort = "popularity",
  numResults = 20
) {
  const searchQuery = getSearchQuery(query);
  let searchUrl = "";
  if (query) {
    searchUrl = `${NYKAA_URL}/search/result/?q=${searchQuery}`;
  } else {
    searchUrl = `${NYKAA_URL}/skin/c/8377?page_no=${page}&sort=${sort}`;
  }

  console.log(searchUrl);

  const htmlContent = await getFinalHtml(searchUrl, true);
  writeToFile("nykaa", htmlContent);

  const $ = cheerio.load(htmlContent);
  const productLinks = [];
  const productNames = [];
  const productPrices = [];
  const productRatings = [];
  const productImages = [];

  const mainSoup = $(".product-listing .productWrapper");

  mainSoup.each((i, item) => {
    const isAd = $(item).find("ul li").text();
    if (isAd === "AD") return;
    console.log(isAd);

    const linkArea = $(item).find("a");
    const linkHref = linkArea.attr("href");
    console.log(linkHref);

    const imageArea = linkArea.find("img");
    const image = imageArea.attr("src");
    console.log(image);
    const name = imageArea.attr("alt");
    console.log(name);

    const priceArea = linkArea.find("div div span").slice(0, 3);
    let price = null;
    let mrp = null;

    if (priceArea.length > 2) {
      const actual = $(priceArea[2]).text();
      mrp = $(priceArea[1]).text();
      price = actual.startsWith("₹") ? actual : mrp;
    } else if (priceArea.length > 1) {
      price = $(priceArea[1]).text();
      mrp = price;
    }

    price = price ? price.replace("₹", "") : null;
    mrp = mrp ? mrp.replace("₹", "") : null;
    console.log(price);

    if (!linkHref || !image || !price || !name) {
      console.log("Couldn't find info, skipping");
      return;
    }

    productLinks.push(`${NYKAA_URL}${linkHref}`);
    productNames.push(name);
    productPrices.push({ mrp, price });
    productRatings.push(null); // Ratings are set to null since they're not being retrieved
    productImages.push(image);

    // if (productLinks.length >= numResults) return false;
  });

  return {
    productLinks,
    productNames,
    productPrices,
    productRatings,
    productImages,
  };
}

exports.nykaa = async (query = "", page = 1, sort = "popularity") => {
  const {
    productLinks,
    productNames,
    productPrices,
    productRatings,
    productImages,
  } = await getNykaaSearchResults(query, page, sort);
  const products = getDetails(
    productLinks,
    productNames,
    productPrices,
    productRatings,
    productImages
  );
  return products;
};
