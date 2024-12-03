import pandas as pd
import torch
import numpy as np
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
from transformers import BertTokenizer, BertForSequenceClassification, Trainer, TrainingArguments, AdamW, get_linear_schedule_with_warmup
from torch.utils.data import Dataset
from sklearn.utils.class_weight import compute_class_weight
import torch.nn as nn

# Load the product dataset
products_df = pd.read_csv('./dataset/products_brand_dataset.csv')

# Load the brand names from brands.csv
brands_df = pd.read_csv('../datasets/brands.csv')
all_possible_brands = brands_df['brand_name'].unique()

# Initialize the LabelEncoder and fit on the full list of possible brands
label_encoder = LabelEncoder()
label_encoder.fit(all_possible_brands)

# Transform the brand names in the product dataset
products_df['brand_name'] = products_df['brand_name'].apply(lambda x: label_encoder.transform([x])[0] if x in label_encoder.classes_ else -1)

# Tokenizer and model initialization
tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')

# Compute class weights for the dataset
class_weights = compute_class_weight('balanced', classes=np.unique(products_df['brand_name']), y=products_df['brand_name'])

# Ensure the class weights tensor has the correct shape (len(label_encoder.classes_))
class_weight_tensor = torch.zeros(len(label_encoder.classes_))

# Fill the tensor with the computed class weights
for idx, class_label in enumerate(label_encoder.classes_):
    if class_label in np.unique(products_df['brand_name']):
        class_weight_tensor[idx] = class_weights[np.where(np.unique(products_df['brand_name']) == class_label)[0][0]]
    else:
        class_weight_tensor[idx] = 1.0  # Default weight if class is missing

# Define custom model class
class CustomBertForSequenceClassification(BertForSequenceClassification):
    def __init__(self, config, class_weights):
        super().__init__(config)
        self.class_weights = class_weights
        self.loss_fct = nn.CrossEntropyLoss(weight=self.class_weights)

    def forward(self, input_ids=None, attention_mask=None, token_type_ids=None, labels=None):
        outputs = super().forward(input_ids, attention_mask=attention_mask, token_type_ids=token_type_ids)
        logits = outputs.logits

        if labels is not None:
            loss = self.loss_fct(logits.view(-1, self.num_labels), labels.view(-1))
            return (loss, outputs)
        else:
            return outputs

# Initialize the custom model
model = CustomBertForSequenceClassification.from_pretrained('bert-base-uncased', num_labels=len(label_encoder.classes_), class_weights=class_weight_tensor)

# Define custom dataset class
class ProductDataset(Dataset):
    def __init__(self, encodings, labels):
        self.encodings = encodings
        self.labels = labels

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, idx):
        item = {key: torch.tensor(val[idx]) for key, val in self.encodings.items()}
        item['labels'] = torch.tensor(self.labels[idx])
        return item

# Prepare dataset
train_df, test_df = train_test_split(products_df, test_size=0.2, random_state=42)

train_encodings = tokenizer(train_df['product_name'].tolist(), padding='max_length', truncation=True, max_length=128)
test_encodings = tokenizer(test_df['product_name'].tolist(), padding='max_length', truncation=True, max_length=128)

train_labels = train_df['brand_name'].values
test_labels = test_df['brand_name'].values

# Create Dataset objects
train_dataset = ProductDataset(train_encodings, train_labels)
test_dataset = ProductDataset(test_encodings, test_labels)

# Compute metrics function
def compute_metrics(p):
    predictions, labels = p
    logits = predictions.logits
    
    # Ensure logits are a PyTorch tensor
    logits_tensor = torch.tensor(logits) if isinstance(logits, np.ndarray) else logits

    # Convert logits to predicted class labels
    preds = torch.argmax(logits_tensor, axis=1)

    accuracy = accuracy_score(labels, preds)
    
    # Compute precision, recall, and F1 score
    precision, recall, f1, _ = precision_recall_fscore_support(labels, preds, average='weighted', zero_division=1)
    
    return {
        'accuracy': accuracy,
        'precision': precision,
        'recall': recall,
        'f1': f1
    }

# Check for device compatibility (MPS for Apple Silicon or CUDA for NVIDIA)
device = torch.device("mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu"))
print(f"Using device: {device}")

# Move model to the appropriate device
model.to(device)

# Training Arguments with Gradient Accumulation and Learning Rate Scheduling
training_args = TrainingArguments(
    output_dir='./trained_model/results',
    evaluation_strategy='epoch',  # Evaluate at the end of each epoch
    learning_rate=2e-5,  # Starting learning rate
    per_device_train_batch_size=32,  # Increased batch size for better gradient estimation
    per_device_eval_batch_size=64,
    num_train_epochs=10,  # Increased epochs for better convergence
    weight_decay=0.01,
    load_best_model_at_end=True,
    metric_for_best_model='accuracy',
    save_strategy='epoch',  # Save model at each epoch
    eval_strategy='epoch',  # Evaluate model at each epoch
    fp16=False,  # Disable mixed precision if using MPS or CPU (set to True for CUDA GPUs)
    gradient_accumulation_steps=2,  # Accumulate gradients to simulate larger batch size
)

# Optimizer and Scheduler
optimizer = AdamW(model.parameters(), lr=2e-5)  # AdamW optimizer
total_steps = len(train_dataset) * training_args.num_train_epochs
scheduler = get_linear_schedule_with_warmup(optimizer, 
                                            num_warmup_steps=0, 
                                            num_training_steps=total_steps)

# Trainer with Optimizer and Scheduler
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=test_dataset,
    compute_metrics=compute_metrics,
    optimizers=(optimizer, scheduler)  # Pass optimizer and scheduler
)

# Train the model
trainer.train()

# Evaluate the model
trainer.evaluate()

# Save the trained model and tokenizer
model.save_pretrained('./trained_model/brand_prediction_model')
tokenizer.save_pretrained('./trained_model/brand_prediction_model')

print("Model and tokenizer saved successfully!")
