const {
  STORE_AMAZON,
  STORE_MYNTRA,
  STORE_NYKAA,
} = require("./utils/constants");
const { getProducts } = require("./controllers/fetchProducts");
const {
  generateBrandsData,
  mergeRefinedData,
  generateProductBrandDataset,
  generateProductCategoriesDataset,
  shuffleRefinedMergedData,
  populateProductCateogries,
} = require("./controllers/generateDataset");
const {
  mapProducts,
  mapProductToIds,
  normaliseMappedProducts,
} = require("./controllers/mapProducts");

// generateProductInfoDataset();
// generateBrandsData();
// generateProductBrandDataset();
// generateProductCategoriesDataset();
// shuffleRefinedMergedData();
// mapProductToIds(STORE_AMAZON);
// mapProductToIds(STORE_MYNTRA);
// mapProductToIds(STORE_NYKAA);
normaliseMappedProducts();

async function main() {
  // await mapProducts();
  // await populateProductCateogries(STORE_AMAZON);
  // await populateProductCateogries(STORE_MYNTRA, 30);
}

// main();
// generateBrandsData();
// mergeRefinedData();
