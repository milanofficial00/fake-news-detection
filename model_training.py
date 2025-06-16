# model_training.py
import re
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
import pickle
import os

# Load the dataset with fallback for bad rows
try:
    data = pd.read_csv('data/sample_fake_news.csv', on_bad_lines='skip', engine='python')
except Exception as e:
    print(" Error reading CSV file:", e)
    exit()

# Check necessary columns
required_cols = ['title', 'description', 'label']
for col in required_cols:
    if col not in data.columns:
        print(f" Missing column: {col}")
        exit()

# Combine title and description for better features
data['combined_text'] = data['title'].astype(str) + ' ' + data['description'].astype(str)

# Preprocess text
def preprocess_text(text):
    text = text.lower()
    text = re.sub(r'[^\w\s]', '', text)
    text = re.sub(r'\d+', '', text)
    return text

data['processed_text'] = data['combined_text'].apply(preprocess_text)

# Split data
X_train, X_test, y_train, y_test = train_test_split(
    data['processed_text'], 
    data['label'], 
    test_size=0.2, 
    random_state=42
)

# Vectorize text
vectorizer = TfidfVectorizer(max_features=5000, stop_words='english')
X_train_vec = vectorizer.fit_transform(X_train)
X_test_vec = vectorizer.transform(X_test)

# Train model
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train_vec, y_train)

# Evaluate
print(" Train accuracy:", model.score(X_train_vec, y_train))
print(" Test accuracy:", model.score(X_test_vec, y_test))

# Save model and vectorizer
os.makedirs('models', exist_ok=True)
with open('models/model.pkl', 'wb') as f:
    pickle.dump(model, f)

with open('models/vectorizer.pkl', 'wb') as f:
    pickle.dump(vectorizer, f)

print(" Model and vectorizer saved successfully in 'models/' folder.")
