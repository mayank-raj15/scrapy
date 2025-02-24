const { default: axios } = require("axios");
const {
  STORE,
  STORE_MYNTRA,
  STORE_NYKAA,
  STORE_AMAZON,
} = require("../utils/constants");
const {
  readFromFile,
  writeToFile,
  jsonify,
  appendToFile,
} = require("../utils/fileUtils");
const {
  PRODUCT_ATTRIBUTES,
  STORE_FROM_CODE,
  STORE_CODES,
  STORE_URL,
} = require("../utils/storeConstants");
const { populateIdData } = require("./mapProducts");

const DEFAULT_OBJ = {
  perfect: [],
  same: [],
  similar: [],
  potential: [],
  brandOnly: [],
};

function getChildrens(idMap, data, leader, parent) {
  const children = idMap[parent].main;
  const grandChildren = [];

  children.forEach((child) => {
    if (!data.leaders[child]) {
      data.leaders[child] = leader;
      grandChildren.push(child, ...getChildrens(idMap, data, leader, child));
    }
  });

  return [...new Set(grandChildren)];
}

function createClusters(idMap, data) {
  Object.keys(idMap).forEach((id) => {
    if (!data.leaders[id]) {
      const leader = id;
      data.leaders[leader] = leader;
      data.clusters[leader] = getChildrens(idMap, data, leader, leader);
    }
  });
}

exports.getMappingInfo = () => {
  const finalData = readFromFile("mapped/finalData.json");
  console.log("Cluster count: ", Object.keys(finalData.clusters).length);
  console.log(
    "Empty clusters count: ",
    Object.keys(finalData.clusters).filter(
      (key) => finalData.clusters[key].length === 0
    ).length
  );
};

exports.createdClusteredData = () => {
  const finalData = readFromFile("mapped/finalData.json");
  const idMap = populateIdData([STORE_NYKAA, STORE_MYNTRA, STORE_AMAZON]);
  const mappingMap = generateMappingMap();

  const clusteredData = [];

  Object.keys(finalData.clusters).forEach((leader) => {
    const cluster = finalData.clusters[leader];
    const clusterItems = [];

    cluster.forEach((id) => {
      const rawProduct = idMap.get(id);
      const store = STORE_FROM_CODE[id.substring(0, 3)];
      if (rawProduct) {
        const filteredProduct = {
          name: getAttributeValue("name", store, rawProduct),
          productId: id,
          price: getAttributeValue("price", store, rawProduct),
          mrp: getAttributeValue("mrp", store, rawProduct),
          rating: getAttributeValue("rating", store, rawProduct),
          ratingCount: getAttributeValue("ratingCount", store, rawProduct),
          brand: getAttributeValue("brand", store, rawProduct),
          pBrand: getAttributeValue("pBrand", store, rawProduct),
          packSize: getAttributeValue("packSize", store, rawProduct),
          categories: {
            l1: getAttributeValue("categories.l1", store, rawProduct),
            l2: getAttributeValue("categories.l2", store, rawProduct),
            l3: getAttributeValue("categories.l3", store, rawProduct),
          },
          color: getAttributeValue("color", store, rawProduct),
          additionalInfo: getAttributeValue(
            "additionalInfo",
            store,
            rawProduct
          ),
          pCategories: {
            l1: getAttributeValue("pCategories.l1", store, rawProduct),
            l2: getAttributeValue("pCategories.l2", store, rawProduct),
            l3: getAttributeValue("pCategories.l3", store, rawProduct),
          },
          // mapped: mappingMap[id],
        };
        clusterItems.push(filteredProduct);
      }
    });

    if (clusterItems.length > 1) {
      clusteredData.push(clusterItems);
    }
  });

  writeToFile("products/clusteredData.json", jsonify(clusteredData));
};

const generateMappingMap = () => {
  const mappingObj = readFromFile(`mapped/${STORE}/all.json`);
  const map = {};

  // many to many mapping for mapped Ids
  // all ids of same type to be mapped with each other
  Object.keys(mappingObj).forEach((mainId) => {
    const mappingTypes = [
      "perfect",
      "same",
      "similar",
      "potential",
      "brandOnly",
    ];

    if (!map[mainId]) {
      map[mainId] = {
        perfect: [],
        same: [],
        similar: [],
        potential: [],
        brandOnly: [],
      };
    }

    mappingTypes.forEach((type) => {
      const pIds = mappingObj[mainId][type];
      const allIds = [...pIds];
      map[mainId][type].push(...pIds);

      pIds.forEach((pId) => {
        allIds.shift();
        if (!map[pId]) {
          map[pId] = {
            perfect: [],
            same: [],
            similar: [],
            potential: [],
            brandOnly: [],
          };
        }
        map[pId][type].push(mainId, ...allIds);
        allIds.push(pId);
      });
    });
  });

  Object.keys(map).forEach((id) => {
    map[id].main = [...new Set([...map[id].perfect, ...map[id].same])];
    map[id].similar = [...new Set([...map[id].similar])];
    map[id].potential = [
      ...new Set([...map[id].potential, ...map[id].brandOnly]),
    ];

    map[id].perfect = undefined;
    map[id].same = undefined;
    map[id].brandOnly = undefined;
  });

  writeToFile("mapped/finalMap.json", jsonify(map));

  console.log(new Date());

  const data = { clusters: {}, leaders: {} };
  createClusters(map, data, null);
  writeToFile("mapped/finalData.json", jsonify(data));

  console.log(new Date());
  return map;
};

exports.generateMappingMap = generateMappingMap;

function getNestedValue(obj, path) {
  const keys = path.split(".");
  return keys.reduce((acc, key) => acc && acc[key], obj);
}

const getAttributeValue = (attr, store, rawProduct) => {
  const attrValue = getNestedValue(
    rawProduct,
    getNestedValue(PRODUCT_ATTRIBUTES, attr)[store]
  );

  switch (attr) {
    case "productId":
      return `${STORE_CODES[store]}${attrValue}`;
    case "url":
      if (attrValue.startsWith("https://"))
        return attrValue.substring(STORE_URL[store].length + 1);
      else return attrValue;
    case "images":
      if (typeof attrValue === "string")
        return [{ view: "default", src: attrValue }];
      else if (store === STORE_MYNTRA) return attrValue;
    case "price":
    case "mrp":
    case "ratingCount":
      return parseInt(attrValue);
    case "rating":
      return parseFloat(attrValue);
    default:
      return attrValue;
  }
};

exports.printGenders = () => {
  const products = readFromFile("products/db_compatible.json");

  const genders = new Set();

  products.forEach((product) => {
    if (product.gender) genders.add(product.gender.toLowerCase());
  });

  console.log([...genders]);
};

const dedupedString = (str = "") => {
  let result = [];
  let prev = null;

  str.split(" ").forEach((word) => {
    if (word !== prev) {
      result.push(word);
      prev = word;
    }
  });

  return result.join(" ");
};

const validateUpdateFields = (product) => {
  ["categories", "pCategories"].forEach((attr) => {
    if (product[attr]) {
      Object.keys(product[attr]).forEach((key) => {
        if (product[attr][key] && product[attr][key].includes("@ Nykaa")) {
          product[attr][key] = product[attr][key].replace("@ Nykaa", "").trim();
        }
      });
    }
  });

  if (!product.additionalInfo) {
    const l1 =
      product.categories?.l1?.trim() ?? product.pCategories?.l1?.trim() ?? "";
    const l3 =
      product.categories?.l3?.trim() ?? product.pCategories?.l3?.trim() ?? "";

    if (l3.toLowerCase().includes(l1.toLowerCase())) {
      product.additionalInfo = l3;
    } else {
      product.additionalInfo = dedupedString(`${l1} ${l3}`);
    }
  }

  if (!product.mrp) {
    product.mrp = product.price;
  }
};

exports.convertProducts = () => {
  console.log(new Date());

  const mappingMap = generateMappingMap();
  const productDataMap = populateIdData([
    STORE_NYKAA,
    STORE_MYNTRA,
    STORE_AMAZON,
  ]);

  const products = [];
  productDataMap.forEach((rawProduct, pId) => {
    const store = STORE_FROM_CODE[pId.substring(0, 3)];
    const productId = getAttributeValue("productId", store, rawProduct);

    const product = {
      name: getAttributeValue("name", store, rawProduct),
      productId,
      url: getAttributeValue("url", store, rawProduct),
      images: getAttributeValue("images", store, rawProduct),
      price: getAttributeValue("price", store, rawProduct),
      mrp: getAttributeValue("mrp", store, rawProduct),
      rating: getAttributeValue("rating", store, rawProduct),
      ratingCount: getAttributeValue("ratingCount", store, rawProduct),
      brand: getAttributeValue("brand", store, rawProduct),
      pBrand: getAttributeValue("pBrand", store, rawProduct),
      packSize: getAttributeValue("packSize", store, rawProduct),
      categories: {
        l1: getAttributeValue("categories.l1", store, rawProduct),
        l2: getAttributeValue("categories.l2", store, rawProduct),
        l3: getAttributeValue("categories.l3", store, rawProduct),
      },
      gender: getAttributeValue("gender", store, rawProduct),
      bodyPart: getAttributeValue("bodyPart", store, rawProduct),
      color: getAttributeValue("color", store, rawProduct),
      additionalInfo: getAttributeValue("additionalInfo", store, rawProduct),
      sku: getAttributeValue("sku", store, rawProduct),
      pCategories: {
        l1: getAttributeValue("pCategories.l1", store, rawProduct),
        l2: getAttributeValue("pCategories.l2", store, rawProduct),
        l3: getAttributeValue("pCategories.l3", store, rawProduct),
      },
      mapped: mappingMap[productId],
    };

    validateUpdateFields(product);

    products.push(product);
  });

  writeToFile("products/db_compatible.json", jsonify(products));

  console.log(new Date());
};

exports.batchProductsForDB = (batchSize = 100) => {
  const products = readFromFile("products/db_compatible.json");
  let batch = 1;
  let currentBatch = [];
  console.log(products.length);

  for (let i = 0; i < products.length; i++) {
    validateUpdateFields(products[i]);
    currentBatch.push(products[i]);
    if (i % batchSize === batchSize - 1 || i === products.length - 1) {
      writeToFile(
        `products/batches/batch-${batch}.json`,
        jsonify(currentBatch)
      );
      batch++;
      currentBatch = [];
    }
  }
};

exports.addProductsToDB = async () => {
  let batchNo = 1001;
  let errorCount = 0;
  await new Promise((resolve) => setTimeout(resolve, 610000));
  console.log("Insertion start time:", new Date());

  while (1) {
    console.log("Batch start time:", new Date());

    try {
      const products = readFromFile(`products/batches/batch-${batchNo}.json`);

      const res = await axios.post(
        "http://localhost:8000/api/v1/products/createProducts",
        {
          products,
          batch: batchNo,
        }
      );

      console.log("Batch done:", batchNo);

      appendToFile("products/batches/done.json", `${batchNo}\n`);
      batchNo++;
      console.log("Batch end time:", new Date());
    } catch (err) {
      console.log(err);
      console.log("Error at batch:", batchNo);

      errorCount++;
      if (errorCount === 5) {
        console.log("Too many errors, exiting");
        appendToFile("products/batches/done.json", `Failed: ${batchNo}\n`);
        break;
      }

      console.log("Waiting for 1 minute before retrying");
      await new Promise((resolve) => setTimeout(resolve, 610000));
    }
  }

  console.log("Insertion end time: ", new Date());
};
