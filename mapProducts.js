function getProductNameFromSlug(slug = "") {
  return slug?.split("/")?.at(0)?.split("-")?.join(" ") ?? [];
}

async function mapData(store = STORE, ctg = CTG) {
  const startTime = new Date();

  const categories = readFromFile("categories.json");
  const storeMappedIds = readFromFile(`mapped/${store}.json`) ?? [];
  const idMap = new Set(storeMappedIds);

  for (let i = 0; i < categories[store].length; i += 1) {
    const category = categories[store][i];
    const { type, id } = category;

    if (type !== ctg) {
      continue;
    }

    console.log("Starting the category: ", type);

    const products = readFromFile(`refined/${store}_${ctg}.json`);
    const count = products.length;

    const indices = getDistinctIndices(5000, 0, count - 1);
    console.log("Indices: ", indices);
    let errorCount = 0;

    for (let ind = 0; ind < indices.length; ind += 1) {
      const index = indices[ind];
      const nykaaProduct = products[index];
      if (idMap.has(nykaaProduct.productId)) {
        continue;
      }

      let nykaaProductSlug = getProductNameFromSlug(nykaaProduct.slug);
      console.log("Searching products for:", nykaaProductSlug);

      try {
        const [amazonProducts, myntraProducts] = await Promise.all([
          amazon(nykaaProductSlug, 3),
          myntra(nykaaProductSlug, 3),
        ]);

        const similarProducts = [nykaaProduct];

        for (let p = 0; p < amazonProducts.length; p++) {
          const amazonProduct = amazonProducts[p];
          if (!amazonProduct) {
            console.log(
              "Undefined product name amazon: ",
              amazonProduct,
              nykaaProductSlug
            );
            continue;
          }

          if (p === 0) {
            similarProducts.push(amazonProduct);
          }
          appendToFile(
            "name_data.csv",
            `${nykaaProduct.name.replaceAll(",", "")},${
              nykaaProduct.price
            },${getStoreUrl(
              "nykaa",
              nykaaProduct.slug
            )},${amazonProduct.name.replaceAll(",", "")},${
              amazonProduct.price
            },${amazonProduct.url},${p === 0 ? "same" : "different"}\n`
          );

          appendToFile("products/amazon.json", `${jsonify(amazonProduct)},\n`);
        }

        for (let p = 0; p < myntraProducts.length; p++) {
          const myntraProduct = myntraProducts[p];
          if (!myntraProduct) {
            console.log(
              "Undefined product name myntra: ",
              myntraProduct,
              nykaaProductSlug
            );
            continue;
          }

          if (p === 0) {
            similarProducts.push(myntraProduct);
          }

          appendToFile(
            "name_data.csv",
            `${nykaaProduct.name.replaceAll(",", "")},${
              nykaaProduct.price
            },${getStoreUrl(
              "nykaa",
              nykaaProduct.slug
            )},${myntraProduct.productName.replaceAll(",", "")},${
              myntraProduct.price
            },${getStoreUrl("myntra", myntraProduct.landingPageUrl)},${
              p === 0 ? "same" : "different"
            }\n`
          );

          appendToFile("products/myntra.json", `${jsonify(myntraProduct)},\n`);
        }

        appendToFile("products/all.json", `${jsonify(similarProducts)},\n`);
        storeMappedIds.push(nykaaProduct.productId);
        idMap.add(nykaaProduct.productId);
        writeToFile(`mapped/${store}.json`, jsonify(storeMappedIds));
      } catch (err) {
        console.log("Error while searching for product: ", nykaaProductSlug);
        errorCount += 1;
        console.log("Errors count:", errorCount);
      }
    }

    console.log("Processed category: ", type);
  }

  const endTime = new Date();

  console.log("Start time: ", startTime);
  console.log("End time: ", endTime);
}
