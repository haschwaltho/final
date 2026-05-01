import os
import json
import requests
from flask import Flask, render_template, request, Response, stream_with_context

app = Flask(
    __name__,
    template_folder="../templates",
    static_folder="../static"
)

N8N_WEBHOOK_URL = os.environ.get("N8N_WEBHOOK_URL")


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json() or {}
    messages = data.get("messages", [])

    def generate():
        try:
            if not N8N_WEBHOOK_URL:
                error_message = "N8N_WEBHOOK_URL is not set in Vercel environment variables."
                yield f"data: {json.dumps({'type': 'error', 'message': error_message})}\n\n"
                return

            response = requests.post(
                N8N_WEBHOOK_URL,
                json={
                    "messages": messages
                },
                timeout=60
            )

            response.raise_for_status()

            try:
                result = response.json()
            except ValueError:
                result = {
                    "answer": response.text
                }

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