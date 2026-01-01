import pandas as pd
import re
import os
import nltk
import joblib

from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report

# Download necessary NLTK data
nltk.download('stopwords')
nltk.download('wordnet')

# Load real and fake news datasets
real_df = pd.read_csv("data/realnews.csv", encoding='ISO-8859-1')
fake_df = pd.read_csv("data/fakenews.csv", encoding='ISO-8859-1')

# Standardize column names
real_df.columns = [col.lower().strip() for col in real_df.columns]
fake_df.columns = [col.lower().strip() for col in fake_df.columns]

# Add label
real_df['label'] = 'real'
fake_df['label'] = 'fake'

# Combine datasets
df = pd.concat([real_df, fake_df], ignore_index=True)
df.dropna(inplace=True)
df = df.sample(frac=1, random_state=42).reset_index(drop=True)

# Setup for preprocessing
stop_words = set(stopwords.words("english"))
lemmatizer = WordNetLemmatizer()

# 🔧 FIXED Preprocessing Function (No nltk.word_tokenize)
def preprocess_text(text):
    text = str(text).lower()
    text = re.sub(r"http\S+|www\S+|https\S+", "", text)
    text = re.sub(r"[^a-zA-Z]", " ", text)
    tokens = text.split()
    tokens = [lemmatizer.lemmatize(w) for w in tokens if w not in stop_words and len(w) > 2]
    return " ".join(tokens)

# Combine title and description for input
df['text'] = df['title'].astype(str) + " " + df['description'].astype(str)
df['cleaned_text'] = df['text'].apply(preprocess_text)

# Vectorization
vectorizer = TfidfVectorizer(max_features=5000, ngram_range=(1, 2))
X = vectorizer.fit_transform(df['cleaned_text'])
y = df['label']

# Split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train model
model = LogisticRegression(max_iter=1000)
model.fit(X_train, y_train)

# Evaluate
y_pred = model.predict(X_test)
print("✅ Accuracy:", accuracy_score(y_test, y_pred))
print("✅ Classification Report:\n", classification_report(y_test, y_pred))

# Save model and vectorizer
os.makedirs("model", exist_ok=True)
joblib.dump(model, "model/fake_news_model.pkl")
joblib.dump(vectorizer, "model/vectorizer.pkl")
