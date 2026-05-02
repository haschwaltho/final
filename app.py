import os
import json
import sqlite3
import bcrypt
import requests
from functools import wraps
from flask import Flask, render_template, request, Response, stream_with_context, jsonify, session
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-only-please-change")
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

N8N_WEBHOOK_URL = os.environ.get("N8N_WEBHOOK_URL")
DB_PATH = os.environ.get("DB_PATH", "users.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            username TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not email or not username or not password:
        return jsonify({"error": "All fields required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    try:
        conn = get_db()
        conn.execute(
            "INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)",
            (email, username, pw_hash)
        )
        conn.commit()
        user = conn.execute("SELECT id, email, username FROM users WHERE email = ?", (email,)).fetchone()
        conn.close()
    except sqlite3.IntegrityError:
        return jsonify({"error": "Email already registered"}), 409

    session["user_id"] = user["id"]
    session["username"] = user["username"]
    return jsonify({"id": user["id"], "username": user["username"], "email": user["email"]})


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    conn.close()

    if not user or not bcrypt.checkpw(password.encode(), user["password_hash"].encode()):
        return jsonify({"error": "Invalid email or password"}), 401

    session["user_id"] = user["id"]
    session["username"] = user["username"]
    return jsonify({"id": user["id"], "username": user["username"], "email": user["email"]})


@app.route("/api/auth/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"ok": True})


@app.route("/api/auth/me", methods=["GET"])
def me():
    if "user_id" not in session:
        return jsonify({"error": "Not authenticated"}), 401
    conn = get_db()
    user = conn.execute("SELECT id, email, username FROM users WHERE id = ?", (session["user_id"],)).fetchone()
    conn.close()
    if not user:
        session.clear()
        return jsonify({"error": "Not authenticated"}), 401
    return jsonify({"id": user["id"], "username": user["username"], "email": user["email"]})


@app.route("/api/chat", methods=["POST"])
@login_required
def chat():
    data = request.get_json()
    messages = data.get("messages", [])
    session_id = data.get("sessionId")

    def generate():
        try:
            if not N8N_WEBHOOK_URL:
                error_message = "N8N_WEBHOOK_URL is not set in environment variables."
                yield f"data: {json.dumps({'type': 'error', 'message': error_message})}\n\n"
                return

            response = requests.post(
                N8N_WEBHOOK_URL,
                json={
                    "sessionId": session_id,
                    "messages": messages
                },
                timeout=60
            )

            response.raise_for_status()

            try:
                result = response.json()
            except ValueError:
                result = {"answer": response.text}

            answer = (
                result.get("answer")
                or result.get("output")
                or result.get("text")
                or result.get("response")
                or "No answer received from n8n."
            )

            yield f"data: {json.dumps({'type': 'delta', 'content': answer})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except requests.exceptions.RequestException as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


init_db()

if __name__ == "__main__":
    app.run(debug=True, port=5000)
