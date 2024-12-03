import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import torch
from torch.utils.data import Dataset, DataLoader
from transformers import AutoTokenizer, AutoModel, AdamW
from torch import nn

# Step 1: Load and preprocess the data
print("Loading data...")
data = pd.read_csv("./dataset/products_categories_dataset.csv")
print(f"Data loaded with {data.shape[0]} rows and {data.shape[1]} columns.")
data = data.dropna()
print(f"Data after dropping missing values: {data.shape[0]} rows.")

# Label encode categories
print("Encoding category labels...")
le_l1 = LabelEncoder()
le_l2 = LabelEncoder()
le_l3 = LabelEncoder()
data['l1_encoded'] = le_l1.fit_transform(data['l1_category'])
data['l2_encoded'] = le_l2.fit_transform(data['l2_category'])
data['l3_encoded'] = le_l3.fit_transform(data['l3_category'])
print("Category encoding completed.")

# Train-test split
print("Splitting data into training and validation sets...")
train_data, val_data = train_test_split(data, test_size=0.2, random_state=42)
print(f"Training data: {train_data.shape[0]} rows, Validation data: {val_data.shape[0]} rows.")

# Step 2: Define the Dataset class
class ProductDataset(Dataset):
    def __init__(self, data, tokenizer, max_length):
        self.data = data
        self.tokenizer = tokenizer
        self.max_length = max_length

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        product_name = self.data.iloc[idx]['product_name']
        l1 = self.data.iloc[idx]['l1_encoded']
        l2 = self.data.iloc[idx]['l2_encoded']
        l3 = self.data.iloc[idx]['l3_encoded']

        inputs = self.tokenizer(
            product_name, 
            max_length=self.max_length, 
            padding="max_length", 
            truncation=True, 
            return_tensors="pt"
        )

        return {
            'input_ids': inputs['input_ids'].squeeze(),
            'attention_mask': inputs['attention_mask'].squeeze(),
            'labels': torch.tensor([l1, l2, l3], dtype=torch.long)
        }

# Step 3: Define the model
class HierarchicalClassifier(nn.Module):
    def __init__(self, model_name, num_l1, num_l2, num_l3):
        super(HierarchicalClassifier, self).__init__()
        print("Initializing model...")
        self.encoder = AutoModel.from_pretrained(model_name)
        hidden_size = self.encoder.config.hidden_size
        self.fc_l1 = nn.Linear(hidden_size, num_l1)
        self.fc_l2 = nn.Linear(hidden_size, num_l2)
        self.fc_l3 = nn.Linear(hidden_size, num_l3)
        print("Model initialized successfully.")

    def forward(self, input_ids, attention_mask):
        outputs = self.encoder(input_ids=input_ids, attention_mask=attention_mask)
        pooled_output = outputs.last_hidden_state[:, 0, :]
        l1_logits = self.fc_l1(pooled_output)
        l2_logits = self.fc_l2(pooled_output)
        l3_logits = self.fc_l3(pooled_output)
        return l1_logits, l2_logits, l3_logits

# Step 4: Initialize tokenizer, dataset, and DataLoader
print("Initializing tokenizer and datasets...")
model_name = "bert-base-uncased"
tokenizer = AutoTokenizer.from_pretrained(model_name)
max_length = 128
train_dataset = ProductDataset(train_data, tokenizer, max_length)
val_dataset = ProductDataset(val_data, tokenizer, max_length)

batch_size = 32
train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
val_loader = DataLoader(val_dataset, batch_size=batch_size)
print("Datasets and DataLoaders initialized.")

# Step 5: Setup model, optimizer, and loss
print("Setting up the model, optimizer, and loss function...")
num_l1 = len(le_l1.classes_)
num_l2 = len(le_l2.classes_)
num_l3 = len(le_l3.classes_)
model = HierarchicalClassifier(model_name, num_l1, num_l2, num_l3)
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model.to(device)
optimizer = AdamW(model.parameters(), lr=5e-5)
criterion = nn.CrossEntropyLoss()
print("Setup complete.")

# Step 6: Training loop
epochs = 5
print(f"Starting training for {epochs} epochs...")
for epoch in range(epochs):
    model.train()
    total_loss = 0
    print(f"Epoch {epoch + 1}/{epochs}:")
    for batch_idx, batch in enumerate(train_loader):
        optimizer.zero_grad()
        input_ids = batch['input_ids'].to(device)
        attention_mask = batch['attention_mask'].to(device)
        labels = batch['labels'].to(device)

        l1_logits, l2_logits, l3_logits = model(input_ids, attention_mask)
        l1_loss = criterion(l1_logits, labels[:, 0])
        l2_loss = criterion(l2_logits, labels[:, 1])
        l3_loss = criterion(l3_logits, labels[:, 2])
        loss = l1_loss + l2_loss + l3_loss

        loss.backward()
        optimizer.step()
        total_loss += loss.item()

        if (batch_idx + 1) % 10 == 0:
            print(f"  Batch {batch_idx + 1}/{len(train_loader)} - Loss: {loss.item():.4f}")

    print(f"Epoch {epoch + 1} completed. Average loss: {total_loss / len(train_loader):.4f}")

# Step 7: Save the model
print("Saving the trained model...")
torch.save(model.state_dict(), "./trained_model/categories_prediction_model.pth")
print("Model saved as categories_prediction_model.pth.")
