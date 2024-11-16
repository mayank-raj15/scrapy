import pandas as pd
from sklearn.model_selection import train_test_split, RandomizedSearchCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.multioutput import MultiOutputClassifier
from sklearn.metrics import make_scorer, accuracy_score
import joblib
from scipy.stats import randint

# Step 1: Load the data from the CSV file
df = pd.read_csv('products_info_dataset.csv')

# Step 2: Inspect the data to make sure it is loaded correctly
print(df.head())

# Step 3: Feature (X) and target variables (y)
X = df['product_name']
y = df[['l0_category', 'l1_category', 'l2_category', 'l3_category', 'brand_name']]

# Step 4: Preprocess the product names (text data)
vectorizer = TfidfVectorizer(max_features=1000, sublinear_tf=True)  # sublinear_tf for faster computation
X_transformed = vectorizer.fit_transform(X)

# Step 5: Encode the categorical target variables using LabelEncoder
label_encoders = {}
y_encoded = y.copy()

for column in y.columns:
    le = LabelEncoder()
    y_encoded[column] = le.fit_transform(y[column])
    label_encoders[column] = le  # Save the encoder to use later for inverse transformation

# Step 6: Train-test split
X_train, X_test, y_train, y_test = train_test_split(X_transformed, y_encoded, test_size=0.2, random_state=42)

# Step 7: Define the base RandomForestClassifier model
rf_model = RandomForestClassifier(random_state=42)

# Step 8: Wrap it with MultiOutputClassifier to handle multiple targets
multi_target_model = MultiOutputClassifier(rf_model, n_jobs=-1)

# Step 9: Custom scoring function for multi-output classification
def multi_output_accuracy(y_true, y_pred):
    """
    Calculate the accuracy for each output label and average them.
    """
    accuracy = 0
    for i in range(y_true.shape[1]):  # Iterate over columns of y_true (or y_pred)
        accuracy += accuracy_score(y_true.iloc[:, i], y_pred[:, i])  # Use .iloc for DataFrame indexing
    return accuracy / y_true.shape[1]  # Return average accuracy

# Make scorer using the custom function
custom_scorer = make_scorer(multi_output_accuracy)

# Step 10: Hyperparameter tuning using RandomizedSearchCV (instead of GridSearchCV)
param_dist = {
    'estimator__n_estimators': randint(100, 200),  # Reduce the number of trees to 100-200 for faster training
    'estimator__max_depth': [10, 20, None],
    'estimator__min_samples_split': [2, 10],
    'estimator__max_features': ['sqrt', 'log2', None],
}

random_search = RandomizedSearchCV(multi_target_model, param_distributions=param_dist, n_iter=12, cv=3, n_jobs=-1, verbose=2, scoring=custom_scorer)

# Step 11: Fit the RandomizedSearchCV to the data
random_search.fit(X_train, y_train)

# Step 12: Best parameters found
print(f"Best parameters: {random_search.best_params_}")

# Step 13: Evaluate the best model
best_model = random_search.best_estimator_

# Predict on the test set
y_pred = best_model.predict(X_test)

# Step 14: Calculate accuracy for each target variable
for i, column in enumerate(y_encoded.columns):
    accuracy = accuracy_score(y_test[column], y_pred[:, i])
    print(f"Accuracy for {column}: {accuracy:.4f}")

# Step 15: Save the trained model, vectorizer, and label encoders
joblib.dump(best_model, 'multi_target_model_best.pkl')
joblib.dump(vectorizer, 'tfidf_vectorizer.pkl')
joblib.dump(label_encoders, 'label_encoders.pkl')

print("Best model, vectorizer, and label encoders saved successfully.")
