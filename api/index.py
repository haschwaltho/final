import os
import json
import sqlite3
import logging
import bcrypt
import requests
from functools import wraps
from flask import Flask, render_template, request, Response, stream_with_context, jsonify, session

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Anchor paths to this file so they resolve correctly on Vercel
_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.dirname(_HERE)

app = Flask(
    __name__,
    template_folder=os.path.join(_ROOT, "templates"),
    static_folder=os.path.join(_ROOT, "static"),
)
app.secret_key = os.environ.get("SECRET_KEY", "dev-only-please-change")
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

N8N_WEBHOOK_URL = os.environ.get("N8N_WEBHOOK_URL")
# /tmp is writable on Vercel but ephemeral — set DB_PATH to a hosted DB for persistence
DB_PATH = os.environ.get("DB_PATH", "/tmp/users.db")


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


# Best-effort module-level init (catches /tmp permission errors gracefully)
try:
    init_db()
except Exception as _e:
    logger.error("module-level init_db failed: %s", _e)


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
    try:
        init_db()
    except Exception as e:
        logger.error("init_db in register: %s", e)
        return jsonify({"error": "Database unavailable"}), 500

    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not email or not username or not password:
        return jsonify({"error": "All fields required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    try:
        pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    except Exception as e:
        logger.error("bcrypt error: %s", e)
        return jsonify({"error": "Server error"}), 500

    try:
        conn = get_db()
        conn.execute(
            "INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)",
            (email, username, pw_hash),
        )
        conn.commit()
        user = conn.execute(
            "SELECT id, email, username FROM users WHERE email = ?", (email,)
        ).fetchone()
        conn.close()
    except sqlite3.IntegrityError:
        return jsonify({"error": "Email already registered"}), 409
    except Exception as e:
        logger.error("register DB error: %s", e)
        return jsonify({"error": "Database error"}), 500

    session["user_id"] = user["id"]
    session["username"] = user["username"]
    return jsonify({"id": user["id"], "username": user["username"], "email": user["email"]})


@app.route("/api/auth/login", methods=["POST"])
def login():
    try:
        init_db()
    except Exception as e:
        logger.error("init_db in login: %s", e)
        return jsonify({"error": "Database unavailable"}), 500

    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "All fields required"}), 400

    try:
        conn = get_db()
        user = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        conn.close()
    except Exception as e:
        logger.error("login DB error: %s", e)
        return jsonify({"error": "Database error"}), 500

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
    try:
        init_db()
        conn = get_db()
        user = conn.execute(
            "SELECT id, email, username FROM users WHERE id = ?", (session["user_id"],)
        ).fetchone()
        conn.close()
    except Exception as e:
        logger.error("me DB error: %s", e)
        session.clear()
        return jsonify({"error": "Not authenticated"}), 401
    if not user:
        session.clear()
        return jsonify({"error": "Not authenticated"}), 401
    return jsonify({"id": user["id"], "username": user["username"], "email": user["email"]})


@app.route("/api/chat", methods=["POST"])
@login_required
def chat():
    data = request.get_json() or {}
    messages = data.get("messages", [])
    session_id = data.get("sessionId")

    def generate():
        try:
            if not N8N_WEBHOOK_URL:
                yield f"data: {json.dumps({'type': 'error', 'message': 'N8N_WEBHOOK_URL is not configured.'})}\n\n"
                return

            response = requests.post(
                N8N_WEBHOOK_URL,
                json={"sessionId": session_id, "messages": messages},
                timeout=55,
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

        except requests.exceptions.Timeout:
            yield f"data: {json.dumps({'type': 'error', 'message': 'AI service timed out. Please try again.'})}\n\n"
        except requests.exceptions.RequestException as e:
            logger.error("n8n request error: %s", e)
            yield f"data: {json.dumps({'type': 'error', 'message': 'Failed to reach AI service.'})}\n\n"
        except Exception as e:
            logger.error("chat error: %s", e)
            yield f"data: {json.dumps({'type': 'error', 'message': 'An unexpected error occurred.'})}\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
