import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.utils.class_weight import compute_class_weight
from sklearn.metrics import precision_score, recall_score, f1_score
from transformers import BertTokenizer, BertForSequenceClassification, Trainer, TrainingArguments
import torch
import numpy as np
from torch.utils.data import Dataset

# Load dataset
data = pd.read_csv('cleanModelData.csv')  # Replace with your actual file path

# Encode the labels: same -> 1, different -> 0
data['label'] = data['verdict'].apply(lambda x: 1 if x.lower() == 'same' else 0)

# Split the dataset into training and validation sets
train_data, val_data = train_test_split(data, test_size=0.2, random_state=42)

# Initialize BERT tokenizer
tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')

# Tokenize and encode the product name pairs
class ProductDataset(Dataset):
    def __init__(self, dataframe):
        self.data = dataframe
    
    def __len__(self):
        return len(self.data)
    
    def __getitem__(self, idx):
        row = self.data.iloc[idx]
        product1 = row['name1']
        product2 = row['name2']
        label = row['label']  # Use the integer-encoded label here

        # Tokenize and convert to PyTorch tensors
        inputs = tokenizer(product1, product2, truncation=True, padding='max_length', max_length=128, return_tensors='pt')

        # Remove the extra batch dimension added by `return_tensors='pt'`
        input_ids = inputs['input_ids'].squeeze(0)
        attention_mask = inputs['attention_mask'].squeeze(0)

        # Return the dictionary that includes the necessary tensors
        return {
            'input_ids': input_ids,
            'attention_mask': attention_mask,
            'labels': torch.tensor(label, dtype=torch.long)
        }

# Create PyTorch datasets
train_dataset = ProductDataset(train_data)
val_dataset = ProductDataset(val_data)

# Calculate class weights for the loss function
class_weights = compute_class_weight(
    class_weight='balanced', 
    classes=np.unique(train_data['label']), 
    y=train_data['label']
)
class_weights_tensor = torch.tensor(class_weights, dtype=torch.float)

# # Load the fine-tuned model and tokenizer from the saved directory
# model = BertForSequenceClassification.from_pretrained('./fine_tuned_model')
# tokenizer = BertTokenizer.from_pretrained('./fine_tuned_model')

# Load BERT model with a classification head (binary classification)
model = BertForSequenceClassification.from_pretrained('bert-base-uncased', num_labels=2)

# Define the training arguments
training_args = TrainingArguments(
    output_dir='./results',           # Output directory
    evaluation_strategy="epoch",      # Evaluate every epoch
    save_strategy="epoch",            # Save the model at each epoch (matches evaluation_strategy)
    per_device_train_batch_size=32,   # Batch size for training
    per_device_eval_batch_size=32,    # Batch size for evaluation
    num_train_epochs=3,               # Number of epochs
    learning_rate=1e-5,               # Learning rate
    logging_dir='./logs',             # Log directory
    logging_steps=10,                 # Log every X updates
    weight_decay=0.02,
    load_best_model_at_end=True       # Save best model
)

# Define Trainer with class weights
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=val_dataset,
    tokenizer=tokenizer,
    compute_metrics=lambda p: {
        'accuracy': (np.argmax(p.predictions, axis=1) == p.label_ids).mean(),
        'precision': precision_score(p.label_ids, np.argmax(p.predictions, axis=1)),
        'recall': recall_score(p.label_ids, np.argmax(p.predictions, axis=1)),
        'f1': f1_score(p.label_ids, np.argmax(p.predictions, axis=1)),
    }
)

# Train the model
trainer.train()

# # Save the fine-tuned model
model.save_pretrained('./fine_tuned_model')
tokenizer.save_pretrained('./fine_tuned_model')

# Evaluate the model
eval_result = trainer.evaluate()
print(f"Evaluation result: {eval_result}")

# Set your threshold (e.g., 0.5)
threshold = 0.5

# Step 1: Get the logits from the model's predictions
eval_logits = trainer.predict(val_dataset).predictions

# Step 2: Apply sigmoid to convert logits to probabilities
eval_probs = torch.sigmoid(torch.tensor(eval_logits)).numpy()

# Step 3: Apply the threshold to convert probabilities to binary predictions (0 or 1)
preds = (eval_probs[:, 1] > threshold).astype(int)  # Compare class 1 probabilities to threshold


# Step 4: Ensure preds is a 1D array (binary values)
if preds.ndim > 1:
    preds = preds.squeeze()

# Step 5: Check that preds and val_data['label'] are the same shape
print(f"Shape of preds: {preds.shape}")
print(f"Shape of val_data['label']: {val_data['label'].shape}")

# Step 6: Compute precision, recall, and F1 score using sklearn
new_precision = precision_score(val_data['label'], preds)
new_recall = recall_score(val_data['label'], preds)
new_f1 = f1_score(val_data['label'], preds)

print(f"New Precision: {new_precision}")
print(f"New Recall: {new_recall}")
print(f"New F1 Score: {new_f1}")