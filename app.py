from flask import Flask, render_template, request, redirect, url_for
import pickle
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
import os
import random
from bs4 import BeautifulSoup
import requests
import re

app = Flask(__name__)

# Load the pre-trained model and vectorizer
model_path = os.path.join('models', 'model.pkl')
vectorizer_path = os.path.join('models', 'vectorizer.pkl')

with open(model_path, 'rb') as f:
    model = pickle.load(f)

with open(vectorizer_path, 'rb') as f:
    vectorizer = pickle.load(f)

# Sample dataset for demonstration
sample_data = pd.read_csv('data/sample_fake_news.csv', on_bad_lines='skip')


def preprocess_text(text):
    """Basic text preprocessing"""
    text = text.lower()
    text = re.sub(r'[^\w\s]', '', text)
    text = re.sub(r'\d+', '', text)
    return text

def extract_text_from_url(url):
    """Extract main text content from a URL"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style", "iframe", "nav", "footer"]):
            script.decompose()
            
        # Get text from paragraphs
        paragraphs = soup.find_all('p')
        text = ' '.join([p.get_text() for p in paragraphs])
        return text
    except Exception as e:
        print(f"Error extracting text from URL: {e}")
        return None

def analyze_news(text):
    """Analyze the news text and return prediction results"""
    # Preprocess the text
    processed_text = preprocess_text(text)
    
    # Vectorize the text
    text_vector = vectorizer.transform([processed_text])
    
    # Make prediction
    prediction = model.predict(text_vector)[0]
    prediction_proba = model.predict_proba(text_vector)[0]
    
    # Get confidence score
    confidence = max(prediction_proba) * 100
    
    # Generate some dummy metrics for visualization
    if prediction == 'FAKE':
        credibility = random.uniform(20, 60)
        bias_score = random.uniform(60, 90)
        source_trust = random.uniform(10, 40)
    else:
        credibility = random.uniform(70, 95)
        bias_score = random.uniform(10, 40)
        source_trust = random.uniform(70, 95)
    
    return {
        'prediction': prediction,
        'confidence': round(confidence, 1),
        'credibility': round(credibility, 1),
        'bias_score': round(bias_score, 1),
        'source_trust': round(source_trust, 1),
        'text_sample': text[:500] + '...' if len(text) > 500 else text
    }

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    news_text = request.form.get('news_text', '').strip()
    
    # Check if input is a URL
    if news_text.startswith(('http://', 'https://')):
        extracted_text = extract_text_from_url(news_text)
        if extracted_text:
            news_text = extracted_text
        else:
            return render_template('index.html', error="Could not extract text from the provided URL.")
    
    if not news_text:
        return render_template('index.html', error="Please enter some news text or a URL to analyze.")
    
    # Analyze the news
    results = analyze_news(news_text)
    
    return render_template('result.html', results=results)

if __name__ == '__main__':
    app.run(debug=True)