const { amazon } = require("../storeDataFetchers/amazon");
const {
  STORE,
  STORE_NYKAA,
  STORE_MYNTRA,
  STORE_AMAZON,
} = require("../utils/constants");
const { myntra } = require("./myntra");
const { STORE_CODES, PRODUCT_ATTRIBUTES } = require("../utils/storeConstants");
const {
  readFromFile,
  appendToFile,
  jsonify,
  writeToFile,
} = require("../utils/fileUtils");
const { compareStrings } = require("../utils/stringUtils");

function getProductNameFromSlug(slug = "") {
  return slug?.split("/")?.at(0)?.split("-")?.join(" ") ?? [];
}

function simplifyString(input) {
  // Remove all characters except letters and spaces, normalize, and convert to lowercase
  let simplified = input
    .normalize("NFD") // Decompose combined letters with accents
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritical marks
    .replace(/[^a-zA-Z\s]/g, "") // Remove non-letter characters
    .replace(/\s+/g, " ") // Replace multiple spaces with a single space
    .trim() // Trim leading and trailing spaces
    .toLowerCase(); // Convert to lowercase

  return simplified;
}

exports.mapProducts = async () => {
  console.log(new Date());

  let errorCount = 0;

  const storeMappedIds = readFromFile(`mapped/${STORE}.json`) ?? [];
  const idMap = new Set(storeMappedIds);

  const mainProducts = readFromFile(`products/${STORE}/refined_beauty.json`);

  for (let i = 0; i < mainProducts.length; i++) {
    // hard coding nykaa for now
    const nykaaProduct = mainProducts[i];

    if (idMap.has(nykaaProduct.productId)) {
      continue;
    }

    let nykaaProductSlug = simplifyString(nykaaProduct.name);
    console.log("Searching products for:", nykaaProductSlug);

    try {
      const [amazonProducts, myntraProducts] = (
        await Promise.allSettled([
          amazon(nykaaProductSlug, 3),
          myntra(nykaaProductSlug, 3),
        ])
      ).map((response, index) => {
        if (response.status === "fulfilled") {
          const products = response.value;
          return products.filter((p) => p !== null && p !== undefined);
        } else {
          console.log(`${index === 0 ? "Amazon" : "Myntra"} request failed!`);
          appendToFile(
            "errorReasons.js",
            `Query: ${nykaaProductSlug}\n${jsonify(response.reason?.message)}`
          );
          console.log("Error while searching for product: ", nykaaProductSlug);
          errorCount += 1;
          console.log("Errors count:", errorCount);
        }
      });

      const similarProductsAmazon = {
        mainProduct: nykaaProduct,
        matchedProducts: amazonProducts,
        type: "amazon",
      };
      const similarProductsMyntra = {
        mainProduct: nykaaProduct,
        matchedProducts: myntraProducts,
        type: "myntra",
      };

      const amazonFound = similarProductsAmazon && amazonProducts?.length > 0;
      const myntraFound = similarProductsMyntra && myntraProducts?.length > 0;

      if (amazonFound) {
        amazonProducts.map((ap) => {
          appendToFile("products/amazon/all.json", `${jsonify(ap)},\n`);
        });
        appendToFile(
          "mapped/products/nykaa.json",
          `${jsonify(similarProductsAmazon)},\n`
        );
      }

      if (myntraFound) {
        myntraProducts.map((mp) => {
          appendToFile("products/myntra/all.json", `${jsonify(mp)},\n`);
        });
        appendToFile(
          "mapped/products/nykaa.json",
          `${jsonify(similarProductsMyntra)},\n`
        );
        appendToFile(
          "mapped/myntra-mapped.json",
          `${jsonify(nykaaProduct.productId)}`
        );
      }

      if (amazonFound && myntraFound) {
        storeMappedIds.push(nykaaProduct.productId);
        idMap.add(nykaaProduct.productId);
        writeToFile(`mapped/${STORE}.json`, jsonify(storeMappedIds));
      }
    } catch (err) {
      appendToFile(
        "errorReasons.js",
        `Query: ${nykaaProductSlug}\n${jsonify(err.message)}`
      );
      console.log("Error while searching for product: ", nykaaProductSlug);
      errorCount += 1;
      console.log("Errors count:", errorCount);
    }

    console.log("Errors count:", errorCount);

    await new Promise((resolve) => {
      setTimeout(() => resolve(1), 2000);
    });
  }

  console.log(new Date());
};

// async function mapData(store = STORE, ctg = "beauty") {
//   const startTime = new Date();

//   const categories = readFromFile("structuralData/categories.json");
//   const storeMappedIds = readFromFile(`mapped/${store}.json`) ?? [];
//   const idMap = new Set(storeMappedIds);

//   for (let i = 0; i < categories[store].length; i += 1) {
//     const category = categories[store][i];
//     const { type, id } = category;

//     if (type !== ctg) {
//       continue;
//     }

//     console.log("Starting the category: ", type);

//     const products = readFromFile(`refined/${store}_${ctg}.json`);
//     const count = products.length;

//     const indices = getDistinctIndices(5000, 0, count - 1);
//     console.log("Indices: ", indices);
//     let errorCount = 0;

//     for (let ind = 0; ind < indices.length; ind += 1) {
//       const index = indices[ind];
//       const nykaaProduct = products[index];
//       if (idMap.has(nykaaProduct.productId)) {
//         continue;
//       }

//       let nykaaProductSlug = getProductNameFromSlug(nykaaProduct.slug);
//       console.log("Searching products for:", nykaaProductSlug);

//       try {
//         const [amazonProducts, myntraProducts] = await Promise.all([
//           amazon(nykaaProductSlug, 3),
//           myntra(nykaaProductSlug, 3),
//         ]);

//         const similarProducts = [nykaaProduct];

//         for (let p = 0; p < amazonProducts.length; p++) {
//           const amazonProduct = amazonProducts[p];
//           if (!amazonProduct) {
//             console.log(
//               "Undefined product name amazon: ",
//               amazonProduct,
//               nykaaProductSlug
//             );
//             continue;
//           }

//           if (p === 0) {
//             similarProducts.push(amazonProduct);
//           }
//           appendToFile(
//             "name_data.csv",
//             `${nykaaProduct.name.replaceAll(",", "")},${
//               nykaaProduct.price
//             },${getStoreUrl(
//               "nykaa",
//               nykaaProduct.slug
//             )},${amazonProduct.name.replaceAll(",", "")},${
//               amazonProduct.price
//             },${amazonProduct.url},${p === 0 ? "same" : "different"}\n`
//           );

//           appendToFile("products/amazon.json", `${jsonify(amazonProduct)},\n`);
//         }

//         for (let p = 0; p < myntraProducts.length; p++) {
//           const myntraProduct = myntraProducts[p];
//           if (!myntraProduct) {
//             console.log(
//               "Undefined product name myntra: ",
//               myntraProduct,
//               nykaaProductSlug
//             );
//             continue;
//           }

//           if (p === 0) {
//             similarProducts.push(myntraProduct);
//           }

//           appendToFile(
//             "name_data.csv",
//             `${nykaaProduct.name.replaceAll(",", "")},${
//               nykaaProduct.price
//             },${getStoreUrl(
//               "nykaa",
//               nykaaProduct.slug
//             )},${myntraProduct.productName.replaceAll(",", "")},${
//               myntraProduct.price
//             },${getStoreUrl("myntra", myntraProduct.landingPageUrl)},${
//               p === 0 ? "same" : "different"
//             }\n`
//           );

//           appendToFile("products/myntra.json", `${jsonify(myntraProduct)},\n`);
//         }

//         appendToFile("products/all.json", `${jsonify(similarProducts)},\n`);
//         storeMappedIds.push(nykaaProduct.productId);
//         idMap.add(nykaaProduct.productId);
//         writeToFile(`mapped/${store}.json`, jsonify(storeMappedIds));
//       } catch (err) {
//         console.log("Error while searching for product: ", nykaaProductSlug);
//         errorCount += 1;
//         console.log("Errors count:", errorCount);
//       }
//     }

//     console.log("Processed category: ", type);
//   }

//   const endTime = new Date();

//   console.log("Start time: ", startTime);
//   console.log("End time: ", endTime);
// }

exports.mapProductToIds = (store = STORE) => {
  const products = readFromFile(`products/${store}/categorisedData.json`);
  const mappedProducts = [];
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const productId =
      STORE_CODES[store] + product[PRODUCT_ATTRIBUTES.id[store]];
    const mappedProduct = { [productId]: product };
    mappedProducts.push(mappedProduct);
  }
  writeToFile(
    `products/${store}/idMappedProducts.json`,
    jsonify(mappedProducts)
  );
};

const populateIdData = (stores = []) => {
  const idMap = new Map();
  stores.forEach((store) => {
    const products = readFromFile(`products/${store}/idMappedProducts.json`);
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      Object.keys(product).forEach((productId) => {
        idMap.set(productId, { ...product[productId] });
      });
    }
  });
  return idMap;
};

exports.normaliseMappedProducts = () => {
  const mappedData = readFromFile(`mapped/products/nykaa.json`);

  const idMap = populateIdData([STORE_NYKAA, STORE_MYNTRA, STORE_AMAZON]);
  const allMatchesMap = {};

  for (let i = 0; i < mappedData.length; i++) {
    const { mainProduct, type, matchedProducts } = mappedData[i];

    /*
      Brand & L1 category & L3 category match -> perfect : perfect_mapped.json
      Brand & L1 category match -> same : same_mapped.json
      L1 & L3 category match -> similar -> similar_mapped.json
      L1 category match -> potential -> potential_mapped.json
      Brand match -> brandOnly -> brandOnly_mapped.json
    */
    const {
      id: mainProductId,
      brandName: mainBrandName,
      primaryCategories: {
        l1: { name: mainL1Category } = {},
        l3: { name: mainL3Category } = {},
      } = {},
    } = mainProduct ?? {};
    const transformedMainProductId = STORE_CODES[STORE_NYKAA] + mainProductId;

    const mappedIdsMap = {
      perfect: [],
      same: [],
      similar: [],
      potential: [],
      brandOnly: [],
      rankedOnly: [],
    };

    matchedProducts.forEach((product) => {
      const id = STORE_CODES[type] + product[PRODUCT_ATTRIBUTES.id[type]];
      const matchedProduct = idMap.get(id);
      let matchType = "none";

      const {
        predictedCategories: {
          l1_category: predictedL1Category,
          l3_category: predictedL3Category,
        } = {},
        predictedBrandName,
      } = matchedProduct ?? {};

      const brandCompared =
        !!mainBrandName &&
        !!predictedBrandName &&
        compareStrings(mainBrandName, predictedBrandName);
      const l1Comapred =
        !!mainL1Category &&
        !!predictedL1Category &&
        compareStrings(mainL1Category, predictedL1Category);
      const l3Compared =
        !!mainL3Category &&
        !!predictedL3Category &&
        compareStrings(mainL3Category, predictedL3Category);

      const mappingData = {
        main: mainProduct,
        matched: matchedProduct,
      };

      if (brandCompared && l1Comapred && l3Compared) {
        matchType = "perfect";
        mappedIdsMap.perfect.push(id);
      } else if (brandCompared && l1Comapred) {
        matchType = "same";
        mappedIdsMap.same.push(id);
      } else if (l1Comapred && l3Compared) {
        matchType = "similar";
        mappedIdsMap.similar.push(id);
      } else if (l1Comapred) {
        matchType = "potential";
        mappedIdsMap.potential.push(id);
      } else if (brandCompared) {
        matchType = "brandOnly";
        mappedIdsMap.brandOnly.push(id);
      }

      appendToFile(
        `mapped/${STORE_NYKAA}/${matchType}_mapped.json`,
        `${jsonify(mappingData)},\n`
      );
    });

    allMatchesMap[transformedMainProductId] = mappedIdsMap;
  }

  writeToFile(`mapped/${STORE_NYKAA}/all.json`, jsonify(allMatchesMap));
};
