from transformers import BertForSequenceClassification, BertTokenizer, Trainer, TrainingArguments
from model import ProductDataset

# Load the fine-tuned model and tokenizer from the saved directory
model = BertForSequenceClassification.from_pretrained('./fine_tuned_model')
tokenizer = BertTokenizer.from_pretrained('./fine_tuned_model')

# Re-create the validation dataset (if it's not saved)
val_dataset = ProductDataset(val_data)

# Define the training arguments again (to match with your previous setup)
training_args = TrainingArguments(
    output_dir='./results',
    per_device_eval_batch_size=16,
    evaluation_strategy="epoch",
    logging_dir='./logs',
)

# Define the compute metrics function
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
import numpy as np

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

# Define the Trainer with the loaded model, tokenizer, and eval dataset
trainer = Trainer(
    model=model,
    args=training_args,
    eval_dataset=val_dataset,
    tokenizer=tokenizer,
    compute_metrics=compute_metrics  # Include metrics calculation
)

# Evaluate the model without training
eval_result = trainer.evaluate()
print(f"Evaluation result: {eval_result}")
