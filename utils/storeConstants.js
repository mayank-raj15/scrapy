const { STORE_AMAZON, STORE_MYNTRA, STORE_NYKAA } = require("./constants");

exports.STORE_URL = {
  nykaa: "https://www.nykaa.com",
  nykaaman: "https://www.nykaaman.com",
  myntra: "https://www.myntra.com",
  amazon: "https://www.amazon.in",
};

exports.PRODUCT_ATTRIBUTES = {
  name: {
    [STORE_AMAZON]: "name",
    [STORE_MYNTRA]: "productName",
    [STORE_NYKAA]: "name",
  },
  productId: {
    [STORE_AMAZON]: "spid",
    [STORE_MYNTRA]: "productId",
    [STORE_NYKAA]: "id",
  },
  url: {
    [STORE_AMAZON]: "url", // starts with https
    [STORE_MYNTRA]: "landingPageUrl",
    [STORE_NYKAA]: "slug",
  },
  images: {
    [STORE_AMAZON]: "image", // url string
    [STORE_MYNTRA]: "images", // array with objects
    [STORE_NYKAA]: "imageUrl", // url string
  },
  price: {
    [STORE_AMAZON]: "price", // string
    [STORE_MYNTRA]: "price", // number,
    [STORE_NYKAA]: "price", // number
  },
  mrp: {
    [STORE_AMAZON]: "mrp", // string
    [STORE_MYNTRA]: "mrp", // number
    [STORE_NYKAA]: "mrp", // number
  },
  rating: {
    [STORE_AMAZON]: "rating", // string
    [STORE_MYNTRA]: "rating", // number
    [STORE_NYKAA]: "rating", // number
  },
  ratingCount: {
    [STORE_AMAZON]: "ratingCount", // number
    [STORE_MYNTRA]: "ratingCount", // number
    [STORE_NYKAA]: "ratingCount", // number
  },
  brand: {
    [STORE_AMAZON]: "",
    [STORE_MYNTRA]: "brand",
    [STORE_NYKAA]: "brandName",
  },
  pBrand: {
    [STORE_AMAZON]: "predictedBrandName",
    [STORE_MYNTRA]: "predictedBrandName",
    [STORE_NYKAA]: "",
  },
  packSize: {
    [STORE_AMAZON]: "",
    [STORE_MYNTRA]: "packSize", // string
    [STORE_NYKAA]: "packSize", // string
  },
  categories: {
    l1: {
      [STORE_AMAZON]: "",
      [STORE_MYNTRA]: "masterCategory",
      [STORE_NYKAA]: "primaryCategories.l1.name",
    },
    l2: {
      [STORE_AMAZON]: "",
      [STORE_MYNTRA]: "subCategory",
      [STORE_NYKAA]: "primaryCategories.l2.name",
    },
    l3: {
      [STORE_AMAZON]: "",
      [STORE_MYNTRA]: "articleType",
      [STORE_NYKAA]: "primaryCategories.l3.name",
    },
  },
  gender: {
    [STORE_AMAZON]: "",
    [STORE_MYNTRA]: "gender",
    [STORE_NYKAA]: "",
  },
  bodyPart: {
    [STORE_AMAZON]: "",
    [STORE_MYNTRA]: "",
    [STORE_NYKAA]: "",
  },
  color: {
    [STORE_AMAZON]: "",
    [STORE_MYNTRA]: "primaryColour",
    [STORE_NYKAA]: "",
  },
  additionalInfo: {
    [STORE_AMAZON]: "",
    [STORE_MYNTRA]: "additionalInfo",
    [STORE_NYKAA]: "",
  },
  sku: {
    [STORE_AMAZON]: "",
    [STORE_MYNTRA]: "",
    [STORE_NYKAA]: "sku",
  },
  pCategories: {
    l1: {
      [STORE_AMAZON]: "predictedCategories.l1_category",
      [STORE_MYNTRA]: "predictedCategories.l1_category",
      [STORE_NYKAA]: "",
    },
    l2: {
      [STORE_AMAZON]: "predictedCategories.l2_category",
      [STORE_MYNTRA]: "predictedCategories.l2_category",
      [STORE_NYKAA]: "",
    },
    l3: {
      [STORE_AMAZON]: "predictedCategories.l3_category",
      [STORE_MYNTRA]: "predictedCategories.l3_category",
      [STORE_NYKAA]: "",
    },
  },
};

exports.STORE_CODES = {
  [STORE_AMAZON]: "amz",
  [STORE_MYNTRA]: "myn",
  [STORE_NYKAA]: "nyk",
};

exports.STORE_FROM_CODE = {
  amz: STORE_AMAZON,
  myn: STORE_MYNTRA,
  nyk: STORE_NYKAA,
};
