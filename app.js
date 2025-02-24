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
  writeMappedAndUnmappedProducts,
  processUnmappedProducts,
} = require("./controllers/mapProducts");
const {
  convertProducts,
  printGenders,
  batchProductsForDB,
  addProductsToDB,
  generateMappingMap,
  getMappingInfo,
  createdClusteredData,
} = require("./controllers/convertProducts");

// generateProductInfoDataset();
// generateBrandsData();
// generateProductBrandDataset();
// generateProductCategoriesDataset();
// shuffleRefinedMergedData();
// mapProductToIds(STORE_AMAZON);
// mapProductToIds(STORE_MYNTRA);
// mapProductToIds(STORE_NYKAA);
// normaliseMappedProducts();
// convertProducts();
// batchProductsForDB(100);
// printGenders();
// writeMappedAndUnmappedProducts(true);
// generateMappingMap();
// getMappingInfo();
createdClusteredData();

async function main() {
  // await mapProducts();
  // await populateProductCateogries(STORE_AMAZON);
  // await populateProductCateogries(STORE_AMAZON, 30);
  // await addProductsToDB();
  // await processUnmappedProducts();
}

// main();
// generateBrandsData();
// mergeRefinedData();
