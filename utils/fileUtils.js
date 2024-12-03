const fs = require("fs");

exports.jsonify = (data) => {
  return JSON.stringify(data, null, 4);
};

exports.writeToFile = (name, data) => {
  try {
    fs.writeFileSync(`./${name}`, data);
  } catch (err) {
    console.error("Error writing to file: ", name, err);
  }
};

exports.appendToFile = (name, data) => {
  try {
    fs.appendFileSync(`./${name}`, data);
  } catch (err) {
    console.error("Error appending to file:", name, err);
  }
};

exports.readFromFile = (name) => {
  try {
    // Read the file content
    const fileContent = fs.readFileSync(`./${name}`, "utf-8");
    // Parse the content to JSON
    const jsonData = JSON.parse(fileContent);

    return jsonData;
  } catch (err) {
    console.error("Error reading or parsing the file:", err);
    throw err;
  }
};
