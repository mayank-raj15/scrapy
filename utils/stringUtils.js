// Function to slugify a given text
exports.slugify = (text) => {
  // Convert to lowercase
  text = text.toLowerCase();

  // Replace special characters like '&' with words (e.g., 'and')
  text = text.replaceAll(/&/g, "and");

  // Replace spaces with hyphens
  text = text.replaceAll(/\s+/g, "-");

  // Remove any remaining non-alphanumeric characters (except hyphens)
  text = text.replaceAll(/[^a-z0-9\-]/g, "");

  return text;
};

// Function to normalize a string by removing special characters and extra spaces
exports.normalizeString = (inputString = "") => {
  // Remove special characters, keeping only alphanumeric and spaces
  const cleanedString = inputString.replaceAll(/[^a-zA-Z0-9\s]/g, "");

  // Remove extra spaces
  const normalizedString = cleanedString.trim().replaceAll(/\s+/g, " ");

  return normalizedString;
};

// Function to generate a random alphanumeric string of specified length
exports.generateRandomString = (length = 10) => {
  return crypto
    .randomBytes(length)
    .toString("base64")
    .slice(0, length)
    .replaceAll(/[^a-zA-Z0-9]/g, "");
};

exports.getStoreUrl = (store = "nykaa", slug = "") => {
  return `${STORE_URL[store]}/${slug}`;
};

exports.compareStrings = (a = "", b = "") => {
  a = a.trim();
  b = b.trim();
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
};
