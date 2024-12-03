const cheerio = require("cheerio");
const { getFinalHtml } = require("../utils/webUtils");

function getNykaaStoreUrl(store = "nykaa") {
  return `https://www.${store}.com`;
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
  ctgType,
  ctgId,
  query,
  page = 1,
  sort = "price_desc",
  store = "nykaa"
) {
  const storeUrl = getNykaaStoreUrl(store);
  const searchQuery = getSearchQuery(query);
  let searchUrl = "";
  if (query) {
    searchUrl = `${storeUrl}/search/result/?q=${searchQuery}`;
  } else {
    searchUrl = `${storeUrl}/${ctgType}/c/${ctgId}?page_no=${page}&sort=${sort}`;
  }

  console.log(searchUrl);

  const { htmlContent, preloadedState } = await getFinalHtml(searchUrl, true);
  const products = preloadedState?.categoryListing?.listingData?.products ?? [];

  const results = products.map(
    ({
      brandIds,
      brandName,
      dynamicTags,
      categoryIds,
      id,
      imageUrl,
      mrp,
      name,
      offersCount,
      price,
      primaryCategories,
      productId,
      quantity,
      rating,
      ratingCount,
      slug,
      title,
      type,
      variantType,
      offer,
      offerId,
      packSize,
      sku,
    }) => ({
      brandIds,
      brandName,
      dynamicTags,
      categoryIds,
      id,
      imageUrl,
      mrp,
      name,
      offersCount,
      price,
      primaryCategories,
      productId,
      quantity,
      rating,
      ratingCount,
      slug,
      title,
      type,
      variantType,
      offer,
      offerId,
      packSize,
      sku,
    })
  );

  if (results.length > 0) return results;

  const $ = cheerio.load(htmlContent);
  const productLinks = [];
  const productNames = [];
  const productPrices = [];
  const productRatings = [];
  const productImages = [];

  const scriptSoup = $("script");
  console.log(scriptSoup.length);

  const mainSoup = $(".product-listing .productWrapper");

  mainSoup.each((i, item) => {
    // const isAd = $(item).find("ul li").text();
    // if (isAd === "AD") return;
    // console.log(isAd);

    const linkArea = $(item).find("a");
    const linkHref = linkArea.attr("href");
    // console.log(linkHref);

    const imageArea = linkArea.find("img");
    const image = imageArea.attr("src");
    // console.log(image);
    const name = imageArea.attr("alt");
    // console.log(name);

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
    price = price ? price.replaceAll(",", "") : null;
    mrp = mrp ? mrp.replaceAll(",", "") : null;

    if (!linkHref || !image || !price || !name) {
      console.log("Couldn't find info, skipping");
      return;
    }

    productLinks.push(`${storeUrl}${linkHref}`);
    productNames.push(name);
    productPrices.push({ mrp, price });
    productRatings.push(null); // Ratings are set to null since they're not being retrieved
    productImages.push(image);

    // if (productLinks.length >= numResults) return false;
  });

  return getDetails(
    productLinks,
    productNames,
    productPrices,
    productRatings,
    productImages
  );
}

exports.nykaa = async (
  query = "",
  page = 1,
  sort = "popularity",
  category = {},
  store = "nykaa"
) => {
  const { type, id } = category;
  const products = await getNykaaSearchResults(
    type,
    id,
    query,
    page,
    sort,
    store
  );
  return products;
};
