from flask import Flask, request, jsonify
import torch
from transformers import BertTokenizer, BertForSequenceClassification

# Load the fine-tuned model and tokenizer
model_path = './fine_tuned_model'  # Adjust this path if needed
model = BertForSequenceClassification.from_pretrained(model_path)
tokenizer = BertTokenizer.from_pretrained(model_path)
model.eval()  # Set the model to evaluation mode

# Initialize Flask app
app = Flask(__name__)

# Helper function to tokenize input with rank
def tokenize_input(name1, name2, rank):
    combined_input = f"{name1} [SEP] {name2} [SEP] rank: {rank}"
    inputs = tokenizer(combined_input, truncation=True, padding='max_length', max_length=128, return_tensors='pt')
    return inputs['input_ids'], inputs['attention_mask']

# Route for single prediction
@app.route('/predict', methods=['POST'])
def predict():
    print(request.json)
    data = request.json
    name1 = data.get('name1')
    name2 = data.get('name2')
    rank = data.get('rank')

    # Tokenize and predict
    input_ids, attention_mask = tokenize_input(name1, name2, rank)
    with torch.no_grad():
        outputs = model(input_ids, attention_mask=attention_mask)
        prediction = torch.argmax(outputs.logits, dim=1).item()

    verdict = 'same' if prediction == 1 else 'different'
    return jsonify({'verdict': verdict})

# Route for batch prediction
@app.route('/batch_predict', methods=['POST'])
def batch_predict():
    data = request.json  # Expects a list of inputs

    # Prepare batch input tensors
    input_ids_list = []
    attention_mask_list = []

    for item in data:
        name1 = item['name1']
        name2 = item['name2']
        rank = item['rank']
        input_ids, attention_mask = tokenize_input(name1, name2, rank)
        input_ids_list.append(input_ids)
        attention_mask_list.append(attention_mask)

    # Stack inputs for batch processing
    input_ids_batch = torch.cat(input_ids_list, dim=0)
    attention_mask_batch = torch.cat(attention_mask_list, dim=0)

    # Get batch predictions
    with torch.no_grad():
        outputs = model(input_ids_batch, attention_mask=attention_mask_batch)
        predictions = torch.argmax(outputs.logits, dim=1).tolist()

    # Map predictions to verdicts
    verdicts = ['same' if pred == 1 else 'different' for pred in predictions]
    return jsonify({'verdicts': verdicts})

# Run the app on port 8002
if __name__ == '__main__':
    app.run(host='127.0.0.1', port=8002)
