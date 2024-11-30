const { STORE_AMAZON, STORE_MYNTRA, STORE_NYKAA } = require("./constants");

exports.PRODUCT_ATTRIBUTES = {
  name: {
    [STORE_AMAZON]: "name",
    [STORE_MYNTRA]: "productName",
  },
  id: {
    [STORE_AMAZON]: "spid",
    [STORE_MYNTRA]: "productId",
    [STORE_NYKAA]: "id",
  },
};

exports.STORE_CODES = {
  [STORE_AMAZON]: "amz",
  [STORE_MYNTRA]: "myn",
  [STORE_NYKAA]: "nyk",
};
