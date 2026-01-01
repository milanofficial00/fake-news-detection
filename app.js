from flask import Flask, render_template, request, redirect, url_for, session, flash
from werkzeug.security import generate_password_hash, check_password_hash
import smtplib, random, time
from email.mime.text import MIMEText
import MySQLdb

def get_db_connection():
    return MySQLdb.connect(
        host="localhost",
        user="root",
        passwd="",
        db="user_accounts"
    )

app = Flask(__name__)
app.secret_key = 'your_secret_key'

# --- Authentication Helper Functions ---
OTP_STORE = {}
OTP_EXPIRY = 300  # seconds
MAX_OTP_ATTEMPTS = 3

def send_otp(email, otp):
    sender = 'bijaypant9848@gmail.com'
    password = 'akhu dhzw fpek mjpb'
    msg = MIMEText(f'Your OTP is: {otp}')
    msg['Subject'] = 'Password Reset OTP'
    msg['From'] = sender
    msg['To'] = email
    try:
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(sender, password)
        server.sendmail(sender, [email], msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print(f"Email error: {e}")
        return False

def get_user_by_username(username):
    db = get_db_connection()
    cursor = db.cursor(MySQLdb.cursors.DictCursor)
    cursor.execute("SELECT * FROM users WHERE username=%s", (username,))
    user = cursor.fetchone()
    db.close()
    return user

def get_user_by_email(email):
    db = get_db_connection()
    cursor = db.cursor(MySQLdb.cursors.DictCursor)
    cursor.execute("SELECT * FROM users WHERE email=%s", (email,))
    user = cursor.fetchone()
    db.close()
    return user

# --- Authentication Routes ---
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = get_user_by_username(username)
        if user and check_password_hash(user['password'], password):
            session['user_id'] = user['id']
            session['username'] = user['username']
            return redirect(url_for('home'))
        else:
            flash('Invalid username or password', 'danger')
    return render_template('login.html')

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        name = request.form['name']
        email = request.form['email']
        phone = request.form['phone']
        username = request.form['username']
        password = request.form['password']
        if get_user_by_username(username):
            flash('Username already exists', 'danger')
            return render_template('signup.html')
        if get_user_by_email(email):
            flash('Email already registered', 'danger')
            return render_template('signup.html')
        hashed_pw = generate_password_hash(password)
        db = get_db_connection()
        cursor = db.cursor()
        cursor.execute("INSERT INTO users (name, email, phone, username, password) VALUES (%s, %s, %s, %s, %s)",
                       (name, email, phone, username, hashed_pw))
        db.commit()
        db.close()
        flash('Registration successful! Please login.', 'success')
        return redirect(url_for('login'))
    return render_template('signup.html')

@app.route('/forgot_password', methods=['GET', 'POST'])
def forgot_password():
    if request.method == 'POST':
        email = request.form['email']
        user = get_user_by_email(email)
        if not user:
            flash('Email not registered', 'danger')
            return render_template('forgot_password.html')
        otp = str(random.randint(100000, 999999))
        OTP_STORE[email] = {'otp': otp, 'timestamp': time.time(), 'attempts': 0}
        if send_otp(email, otp):
            session['reset_email'] = email
            flash('OTP sent to your email', 'info')
            return redirect(url_for('verify_otp'))
        else:
            flash('Failed to send OTP. Try again.', 'danger')
    return render_template('forgot_password.html')

@app.route('/verify_otp', methods=['GET', 'POST'])
def verify_otp():
    email = session.get('reset_email')
    if not email or email not in OTP_STORE:
        return redirect(url_for('forgot_password'))
    if request.method == 'POST':
        otp_input = request.form['otp']
        otp_data = OTP_STORE[email]
        if time.time() - otp_data['timestamp'] > OTP_EXPIRY:
            flash('OTP expired. Please request again.', 'danger')
            OTP_STORE.pop(email, None)
            return redirect(url_for('forgot_password'))
        otp_data['attempts'] += 1
        if otp_data['attempts'] > MAX_OTP_ATTEMPTS:
            flash('Too many attempts. Please request again.', 'danger')
            OTP_STORE.pop(email, None)
            return redirect(url_for('forgot_password'))
        if otp_input == otp_data['otp']:
            session['otp_verified'] = True
            flash('OTP verified. You can reset your password.', 'success')
            return redirect(url_for('reset_password'))
        else:
            flash('Incorrect OTP. Try again.', 'danger')
    return render_template('verify_otp.html')

@app.route('/reset_password', methods=['GET', 'POST'])
def reset_password():
    email = session.get('reset_email')
    if not email or not session.get('otp_verified'):
        return redirect(url_for('forgot_password'))
    if request.method == 'POST':
        new_password = request.form['password']
        hashed_pw = generate_password_hash(new_password)
        db = get_db_connection()
        cursor = db.cursor()
        cursor.execute("UPDATE users SET password=%s WHERE email=%s", (hashed_pw, email))
        db.commit()
        db.close()
        OTP_STORE.pop(email, None)
        session.pop('reset_email', None)
        session.pop('otp_verified', None)
        flash('Password reset successful! Please login.', 'success')
        return redirect(url_for('login'))
    return render_template('reset_password.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

# ==== FAKE NEWS VERIFICATION PART ====

from websearch import verify_claim
import re
import joblib

model = joblib.load('model/fake_news_model.pkl')
vectorizer = joblib.load('model/vectorizer.pkl')


STOP_WORDS = set([
    'a', 'an', 'the', 'and', 'or', 'is', 'are', 'was', 'were', 'in', 'on', 'at',
    'to', 'for', 'of', 'by', 'with', 'that', 'this', 'it', 'from', 'as', 'be',
    'has', 'have', 'had', 'not', 'but', 'if', 'they', 'he', 'she', 'you', 'we',
    'i', 'me', 'my', 'your', 'our', 'us', 'so', 'do', 'does', 'did', 'can',
    'will', 'would', 'should', 'could'
])

def preprocess_text(text):
    text = text.lower()
    text = re.sub(r'[^a-z\s]', '', text)
    tokens = text.split()
    tokens = [tok for tok in tokens if tok not in STOP_WORDS and len(tok) > 1]
    return ' '.join(tokens)

def is_invalid_input(text):
    text = text.strip()
    if not text:
        return True
    if re.fullmatch(r'\d+', text):
        return True
    if re.fullmatch(r'[^a-zA-Z0-9]+', text):
        return True
    words = text.split()
    if len(words) < 5 or len(text) < 15:
        if not re.search(r'\b(is|are|was|were|has|have|do|does|did|be|am)\b', text.lower()):
            return True
    return False

def classify_input_type(input_text):
    if '||' in input_text:
        parts = input_text.split('||')
        title = parts[0].strip()
        description = parts[1].strip()
        if title and description:
            return 'both', title, description
        elif title:
            return 'title', title, ''
        elif description:
            return 'description', '', description
    else:
        words = input_text.split()
        if len(words) <= 15:
            return 'title', input_text.strip(), ''
        else:
            return 'description', '', input_text.strip()

@app.route('/')
def home():
    if not session.get('user_id'):
        return redirect(url_for('login'))
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    if not session.get('user_id'):
        return redirect(url_for('login'))
    raw_input = request.form.get('news_text', '').strip()
    use_web_search = request.form.get('use_web_search') == 'on'
    web_search_only = request.form.get('web_search_only') == 'on'

    if is_invalid_input(raw_input):
        return render_template('index.html', error="Invalid input detected. Please enter valid news content.")

    input_type, title, description = classify_input_type(raw_input)

    ml_prediction = None
    web_verdict = None
    similarity_percentage = None
    web_confidence = None
    verdict_class = None

    if web_search_only or use_web_search:
        web_result = verify_claim(raw_input)
        similarity_percentage = max(web_result['wiki_score'], web_result['ddg_score']) * 100
        web_confidence = similarity_percentage

        if web_result['wiki_matched'] and web_result['ddg_matched']:
            web_verdict = "✅ Real News"
            verdict_class = 'real'
        elif web_result['wiki_matched'] or web_result['ddg_matched']:
            web_verdict = "⚠️ Possibly Real"
            verdict_class = 'orange'
        else:
            web_verdict = "❌ Possibly Fake"
            verdict_class = 'fake'

        combined_evidence = [(evi, "Wikipedia") for evi in web_result['evidence']['wikipedia']] + \
                            [(evi, "DuckDuckGo") for evi in web_result['evidence']['duckduckgo']]
    else:
        combined_evidence = []

    if not web_search_only:
        processed_text = preprocess_text(f"{title} {description}" if input_type == 'both' else title or description)
        vect_text = vectorizer.transform([processed_text])
        pred_label_num = model.predict(vect_text)[0]
        label_map = {
    1: "REAL", 0: "FAKE",
    "real": "REAL", "fake": "FAKE"
}

        ml_prediction = label_map.get(pred_label_num, "UNKNOWN")

    snippet_sample = title if input_type == 'title' else (description if input_type == 'description' else f"{title} || {description}")

    return render_template('result.html',
                           input_type=input_type,
                           title=title,
                           description=description,
                           ml_prediction=ml_prediction,
                           web_verdict=web_verdict,
                           similarity_percentage=similarity_percentage,
                           web_confidence=web_confidence,
                           verdict_class=verdict_class,
                           snippet_sample=snippet_sample,
                           combined_evidence=combined_evidence)

if __name__ == '__main__':
    app.run(debug=True)
