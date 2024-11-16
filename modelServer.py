from flask import Flask, request, jsonify
import torch
from transformers import BertTokenizer, BertForSequenceClassification
from sklearn.preprocessing import LabelEncoder
import pandas as pd

# Load the earlier model and tokenizer for product similarity
similarity_model_path = './fine_tuned_model'  # Adjust this path if needed
similarity_model = BertForSequenceClassification.from_pretrained(similarity_model_path)
similarity_tokenizer = BertTokenizer.from_pretrained(similarity_model_path)
similarity_model.eval()  # Set the model to evaluation mode

# Load the new model and tokenizer for brand name prediction
brand_model_path = './saved_model'  # Adjust this path if needed
brand_model = BertForSequenceClassification.from_pretrained(brand_model_path)
brand_tokenizer = BertTokenizer.from_pretrained(brand_model_path)
brand_model.eval()  # Set the model to evaluation mode

# Load the label encoder for the brand prediction model
brands_df = pd.read_csv('brands.csv')  # Ensure this is accessible
all_possible_brands = brands_df['brand_name'].unique()
label_encoder = LabelEncoder()
label_encoder.fit(all_possible_brands)

# Initialize Flask app
app = Flask(__name__)

# Helper functions
def tokenize_similarity_input(name1, name2, rank):
    combined_input = f"{name1} [SEP] {name2} [SEP] rank: {rank}"
    inputs = similarity_tokenizer(combined_input, truncation=True, padding='max_length', max_length=128, return_tensors='pt')
    return inputs['input_ids'], inputs['attention_mask']

def tokenize_brand_input(product_name):
    inputs = brand_tokenizer(
        product_name, truncation=True, padding='max_length', max_length=128, return_tensors='pt'
    )
    return inputs['input_ids'], inputs['attention_mask']

# Routes for similarity model
@app.route('/predict', methods=['POST'])
def predict_similarity():
    data = request.json
    name1 = data.get('name1')
    name2 = data.get('name2')
    rank = data.get('rank')

    if not (name1 and name2 and rank is not None):
        return jsonify({'error': 'name1, name2, and rank are required'}), 400

    input_ids, attention_mask = tokenize_similarity_input(name1, name2, rank)
    with torch.no_grad():
        outputs = similarity_model(input_ids, attention_mask=attention_mask)
        prediction = torch.argmax(outputs.logits, dim=1).item()

    verdict = 'same' if prediction == 1 else 'different'
    return jsonify({'verdict': verdict})

@app.route('/batch_predict', methods=['POST'])
def batch_predict_similarity():
    data = request.json

    if not isinstance(data, list) or not all(('name1' in item and 'name2' in item and 'rank' in item) for item in data):
        return jsonify({'error': 'Request data must be a list of objects with "name1", "name2", and "rank" keys'}), 400

    input_ids_list = []
    attention_mask_list = []

    for item in data:
        name1 = item['name1']
        name2 = item['name2']
        rank = item['rank']
        input_ids, attention_mask = tokenize_similarity_input(name1, name2, rank)
        input_ids_list.append(input_ids)
        attention_mask_list.append(attention_mask)

    input_ids_batch = torch.cat(input_ids_list, dim=0)
    attention_mask_batch = torch.cat(attention_mask_list, dim=0)

    with torch.no_grad():
        outputs = similarity_model(input_ids_batch, attention_mask=attention_mask_batch)
        predictions = torch.argmax(outputs.logits, dim=1).tolist()

    verdicts = ['same' if pred == 1 else 'different' for pred in predictions]
    return jsonify({'verdicts': verdicts})

# Routes for brand prediction model
@app.route('/predict_brand', methods=['POST'])
def predict_brand():
    data = request.json
    product_name = data.get('product_name')

    if not product_name:
        return jsonify({'error': 'product_name is required'}), 400

    input_ids, attention_mask = tokenize_brand_input(product_name)
    with torch.no_grad():
        outputs = brand_model(input_ids, attention_mask=attention_mask)
        prediction_idx = torch.argmax(outputs.logits, dim=1).item()

    brand_name = label_encoder.inverse_transform([prediction_idx])[0]
    return jsonify({'brand_name': brand_name})

@app.route('/batch_predict_brand', methods=['POST'])
def batch_predict_brand():
    data = request.json

    if not isinstance(data, list) or not all('product_name' in item for item in data):
        return jsonify({'error': 'Request data must be a list of objects with "product_name" keys'}), 400

    input_ids_list = []
    attention_mask_list = []

    for item in data:
        product_name = item['product_name']
        input_ids, attention_mask = tokenize_brand_input(product_name)
        input_ids_list.append(input_ids)
        attention_mask_list.append(attention_mask)

    input_ids_batch = torch.cat(input_ids_list, dim=0)
    attention_mask_batch = torch.cat(attention_mask_list, dim=0)

    with torch.no_grad():
        outputs = brand_model(input_ids_batch, attention_mask=attention_mask_batch)
        prediction_indices = torch.argmax(outputs.logits, dim=1).tolist()

    brand_names = label_encoder.inverse_transform(prediction_indices)
    return jsonify({'brand_names': brand_names})

# Run the app on port 8002
if __name__ == '__main__':
    app.run(host='127.0.0.1', port=8002)
