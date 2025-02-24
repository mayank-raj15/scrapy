const { amazon } = require("../storeDataFetchers/amazon");
const {
  STORE,
  STORE_NYKAA,
  STORE_MYNTRA,
  STORE_AMAZON,
} = require("../utils/constants");
const { myntra } = require("../storeDataFetchers/myntra");
const {
  STORE_CODES,
  PRODUCT_ATTRIBUTES,
  STORE_FROM_CODE,
} = require("../utils/storeConstants");
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

  return simplified.split(" ").slice(0, 6).join(" ");
}

const STORE_MAPPER_FUNC = {
  [STORE_MYNTRA]: myntra,
  [STORE_AMAZON]: amazon,
};

exports.getMappedProducts = async (
  searchQuery,
  productId,
  stores = [STORE_AMAZON, STORE_MYNTRA]
) => {
  const promises = stores.map((store) =>
    STORE_MAPPER_FUNC[store](searchQuery, 3)
  );

  const storeProducts = (await Promise.allSettled(promises)).map(
    (response, index) => {
      if (response.status === "fulfilled") {
        const products = response.value.filter(
          (p) => p !== null && p !== undefined
        );
        return products;
      } else {
        console.log(`${stores[index]} request failed!`);
        appendToFile(`mapped/errors/${stores[index]}.json`, jsonify(productId));
        console.log("Error while search for product:", searchQuery);
        console.log("Error:", response.reason);
        return false;
      }
    }
  );

  const output = {};

  stores.forEach((store, index) => {
    if (typeof storeProducts[index] === "boolean") {
      output[store] = { isError: true };
    } else {
      output[store] = { isError: false, products: storeProducts[index] };
    }
  });

  return output;
};

exports.writeMappedAndUnmappedProducts = (firstTime = false) => {
  const ALL_STORES = [STORE_AMAZON, STORE_MYNTRA];
  const mappedProducts = [];
  const unmappedProducts = [];

  const idMappedProducts = readFromFile(
    `products/${STORE}/idMappedProducts.json`
  );
  const mappingMap = readFromFile(`mapped/${STORE}/all.json`);

  for (let i = 0; i < idMappedProducts.length; i++) {
    const product = idMappedProducts[i];
    const productId = Object.keys(product)[0];
    const mappedProduct = mappingMap[productId];

    const doneStores = new Set();
    if (mappedProduct) {
      Object.keys(mappedProduct).forEach((key) => {
        mappedProduct[key].forEach((id) => {
          if (STORE_FROM_CODE[id.substring(0, 3)]) {
            doneStores.add(STORE_FROM_CODE[id.substring(0, 3)]);
          }
        });
      });
    }

    if (doneStores.size > 0) {
      const mappedProductData = {
        productId,
        searchQuery: simplifyString(product[productId].name),
        doneStores: Array.from(doneStores),
      };
      mappedProducts.push(mappedProductData);
    }

    if (!(doneStores.size === ALL_STORES.length)) {
      const unMappedProductData = {
        productId,
        searchQuery: simplifyString(product[productId].name),
        remainingStores: ALL_STORES.filter((store) => !doneStores.has(store)),
      };
      unmappedProducts.push(unMappedProductData);
    }

    if (doneStores.size === 2) {
      console.log("hello there");
    }
  }

  writeToFile(`mapped/${STORE}/mappedProducts.json`, jsonify(mappedProducts));
  writeToFile(
    `mapped/${STORE}/unmappedProducts.json`,
    jsonify(unmappedProducts)
  );
};

const writeMappedProductsToFile = (store, products, mainProduct) => {
  const data = {
    mainProduct,
    type: store,
    matchedProducts: products,
  };

  products.map((product) => {
    appendToFile(`products/${store}/all.json`, `${jsonify(product)},\n`);
  });
  appendToFile(`mapped/products/${STORE}.json`, `${jsonify(data)},\n`);
};

exports.processUnmappedProducts = async () => {
  const unmappedProducts = readFromFile(
    `mapped/${STORE}/unmappedProducts.json`
  );
  const idMap = exports.populateIdData([STORE]);

  const mappedList = readFromFile("mapped/products/mappedList.json") ?? [];
  const unmappedList = readFromFile("mapped/products/unmappedList.json") ?? [];
  const lastDoneIndex = 0;
  let allCounts = 0;
  let avgTime = 0;

  let errorCount = 0;

  console.log(unmappedList.length);

  for (let i = lastDoneIndex + 1; i < unmappedList.length; i++) {
    const { productId, searchQuery, remainingStores } = unmappedList[i];

    const stTime = new Date();

    if (errorCount === 10) {
      console.log("Too many errors. Sleeping for 1 minute!");
      await new Promise((resolve) => {
        setTimeout(() => resolve(1), 60000);
      });
      errorCount = 0;
    }

    console.log("Processing product id:", productId);

    const mappedProducts = await exports.getMappedProducts(
      searchQuery,
      productId,
      remainingStores
    );

    const doneStores = [];
    const erroredStores = [];

    remainingStores.forEach((store) => {
      console.log("Processing store:", store);
      if (mappedProducts[store].isError) {
        console.log("Store errored!");
        erroredStores.push(store);
        errorCount += 1;
      } else {
        const { products } = mappedProducts[store];
        console.log("Products found with length:", products.length);
        if (products.length > 0) {
          // write to mapped files
          doneStores.push(store);
          writeMappedProductsToFile(store, products, idMap.get(productId));
        }
      }
    });

    if (erroredStores.length > 0) {
      unmappedList.push({
        productId,
        searchQuery,
        remainingStores: erroredStores,
      });
      appendToFile(
        "notDone.json",
        jsonify({ productId, searchQuery, remainingStores: erroredStores })
      );
    }
    if (doneStores.length > 0) {
      mappedList.push({
        productId,
        searchQuery,
        doneStores,
      });
      appendToFile(
        "done.json",
        jsonify({ productId, searchQuery, doneStores })
      );
    }

    const endTime = new Date();

    console.log("Mapped index:", i);
    console.log("Errors count:", errorCount);
    allCounts += 1;
    avgTime = (avgTime * (allCounts - 1) + (endTime - stTime)) / allCounts;
    console.log("Average time:", Math.round(avgTime) / 1000);
    if (i % 10 === 0) {
      writeToFile("doneIndex.json", jsonify({ index: i }));
      console.log("writing mapped/unmapped data");
      writeToFile("mapped/products/mappedList.json", jsonify(mappedList));
    }
    writeToFile("mapped/products/unmappedList.json", jsonify(unmappedList));
  }
};

/* exports.mapProducts = async () => {
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
}; */

exports.mapProductToIds = (store = STORE) => {
  const products = readFromFile(`products/${store}/categorisedData.json`);
  console.log(`Store: ${store} has ${products.length} products`);
  const mappedProducts = [];
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const productId =
      STORE_CODES[store] + product[PRODUCT_ATTRIBUTES.productId[store]];
    const mappedProduct = { [productId]: product };
    mappedProducts.push(mappedProduct);
  }
  console.log(`Mapped ${mappedProducts.length} products`);
  writeToFile(
    `products/${store}/idMappedProducts.json`,
    jsonify(mappedProducts)
  );
};

exports.populateIdData = (stores = []) => {
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
  const mappedData0 = readFromFile(`mapped/products/nykaa-0.json`);
  const mappedData1 = readFromFile(`mapped/products/nykaa-1.json`);
  const mappedData = [...mappedData0, ...mappedData1];

  const idMap = exports.populateIdData([
    STORE_NYKAA,
    STORE_MYNTRA,
    STORE_AMAZON,
  ]);
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
      const id =
        STORE_CODES[type] + product[PRODUCT_ATTRIBUTES.productId[type]];
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

    if (!allMatchesMap[transformedMainProductId]) {
      allMatchesMap[transformedMainProductId] = mappedIdsMap;
    } else {
      Object.keys(mappedIdsMap).forEach((key) => {
        allMatchesMap[transformedMainProductId][key].push(...mappedIdsMap[key]);
      });
    }
  }

  Object.keys(allMatchesMap).forEach((productId) => {
    const productMap = allMatchesMap[productId];
    Object.keys(productMap).forEach((key) => {
      productMap[key] = [...new Set(productMap[key])];
    });
  });

  writeToFile(`mapped/${STORE_NYKAA}/all.json`, jsonify(allMatchesMap));
};
