import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from transformers import BertTokenizer, BertForSequenceClassification, Trainer, TrainingArguments
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
import torch

# Load dataset
data = pd.read_csv('cleanModelDataRanked.csv')  # Replace with your actual file path

# Encode the labels: same -> 1, different -> 0
data['label'] = data['verdict'].apply(lambda x: 1 if x.lower() == 'same' else 0)

# Split the dataset into training and validation sets
train_data, val_data = train_test_split(data, test_size=0.2, random_state=42)

# Initialize BERT tokenizer
tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')

# Tokenize and encode the product name pairs with rank
def tokenize_pairs_with_rank(product1, product2, rank):
    # Concatenate rank as part of the input text
    combined_input = f"{product1} [SEP] {product2} [SEP] rank: {rank}"
    return tokenizer(combined_input, truncation=True, padding='max_length', max_length=128, return_tensors='pt')

# Prepare dataset for PyTorch
class ProductDataset(torch.utils.data.Dataset):
    def __init__(self, dataframe):
        self.data = dataframe
    
    def __len__(self):
        return len(self.data)
    
    def __getitem__(self, idx):
        row = self.data.iloc[idx]
        product1 = row['name1']
        product2 = row['name2']
        rank = row['rank']   # New rank field
        label = row['label']  # Use the integer-encoded label here

        # Tokenize with rank
        inputs = tokenize_pairs_with_rank(product1, product2, rank)

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

# Define metric computation
def compute_metrics(p):
    pred, labels = p
    pred = np.argmax(pred, axis=1)
    accuracy = accuracy_score(labels, pred)
    precision, recall, f1, _ = precision_recall_fscore_support(labels, pred, average='binary')
    return {
        'accuracy': accuracy,
        'precision': precision,
        'recall': recall,
        'f1': f1
    }

# Load BERT model with a classification head (binary classification)
model = BertForSequenceClassification.from_pretrained('bert-base-uncased', num_labels=2)

# Define the training arguments
training_args = TrainingArguments(
    output_dir='./results',           # Output directory
    evaluation_strategy="epoch",      # Evaluate every epoch
    save_strategy="epoch",            # Save the model at each epoch (matches evaluation_strategy)
    per_device_train_batch_size=16,   # Batch size for training
    per_device_eval_batch_size=16,    # Batch size for evaluation
    num_train_epochs=3,               # Number of epochs
    logging_dir='./logs',             # Log directory
    logging_steps=10,                 # Log every X updates
    load_best_model_at_end=True       # Save best model
)

# Define Trainer
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=val_dataset,
    tokenizer=tokenizer,
    compute_metrics=compute_metrics  # Include metrics calculation
)

# Train the model
trainer.train()

# Save the fine-tuned model
model.save_pretrained('./fine_tuned_model')
tokenizer.save_pretrained('./fine_tuned_model')

# Evaluate the model
eval_result = trainer.evaluate()
print(f"Evaluation result: {eval_result}")
