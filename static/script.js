/* ── Marked.js config ── */
marked.setOptions({
  breaks: true,
  gfm: true,
  highlight: null,
});

const renderer = new marked.Renderer();

renderer.code = function (code, language) {
  const lang = (language || "").trim();
  const validLang = lang && hljs.getLanguage(lang) ? lang : "plaintext";
  let highlighted;
  try {
    highlighted = hljs.highlight(code, { language: validLang }).value;
  } catch {
    highlighted = hljs.highlightAuto(code).value;
  }
  return `<div class="code-block">
    <div class="code-header">
      <span class="code-lang">${lang || "code"}</span>
      <button class="copy-btn" onclick="copyCode(this)">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
        Копировать
      </button>
    </div>
    <pre><code class="hljs ${lang}">${highlighted}</code></pre>
  </div>`;
};

marked.use({ renderer });

/* ── State ── */
let conversations = JSON.parse(localStorage.getItem("conversations") || "[]");
let currentConvId = null;
let isStreaming = false;

/* ── DOM refs ── */
const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");
const sidebarToggleMobile = document.getElementById("sidebarToggleMobile");
const newChatBtn = document.getElementById("newChatBtn");
const chatHistory = document.getElementById("chatHistory");
const welcome = document.getElementById("welcome");
const messagesEl = document.getElementById("messages");
const chatArea = document.getElementById("chatArea");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

/* ── Sidebar toggle ── */
sidebarToggle.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
});

sidebarToggleMobile.addEventListener("click", () => {
  sidebar.classList.toggle("open");
  if (sidebar.classList.contains("open")) {
    showOverlay();
  } else {
    hideOverlay();
  }
});

function showOverlay() {
  const existing = document.querySelector(".overlay");
  if (existing) return;
  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.addEventListener("click", () => {
    sidebar.classList.remove("open");
    hideOverlay();
  });
  document.body.appendChild(overlay);
}

function hideOverlay() {
  const overlay = document.querySelector(".overlay");
  if (overlay) overlay.remove();
}

/* ── New chat ── */
newChatBtn.addEventListener("click", startNewChat);

function startNewChat() {
  currentConvId = null;
  messagesEl.innerHTML = "";
  welcome.style.display = "flex";
  messagesEl.style.display = "none";
  renderHistory();
  userInput.focus();
  if (window.innerWidth <= 768) {
    sidebar.classList.remove("open");
    hideOverlay();
  }
}

/* ── Suggestion cards ── */
document.querySelectorAll(".suggestion-card").forEach((card) => {
  card.addEventListener("click", () => {
    const text = card.dataset.text;
    userInput.value = text;
    adjustHeight();
    sendBtn.disabled = false;
    sendMessage();
  });
});

/* ── Input handling ── */
userInput.addEventListener("input", () => {
  adjustHeight();
  sendBtn.disabled = userInput.value.trim() === "" || isStreaming;
});

userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    if (!sendBtn.disabled) sendMessage();
  }
});

function adjustHeight() {
  userInput.style.height = "auto";
  userInput.style.height = Math.min(userInput.scrollHeight, 200) + "px";
}

/* ── Send message ── */
sendBtn.addEventListener("click", sendMessage);

async function sendMessage() {
  const text = userInput.value.trim();
  if (!text || isStreaming) return;

  // Hide welcome, show messages
  welcome.style.display = "none";
  messagesEl.style.display = "flex";

  // Init conversation
  if (!currentConvId) {
    currentConvId = Date.now().toString();
    conversations.unshift({
      id: currentConvId,
      title: text.slice(0, 45) + (text.length > 45 ? "…" : ""),
      messages: [],
    });
    saveConversations();
    renderHistory();
  }

  const conv = getConv();
  conv.messages.push({ role: "user", content: text });
  saveConversations();

  // Render user message
  appendMessage("user", text);

  userInput.value = "";
  userInput.style.height = "auto";
  sendBtn.disabled = true;
  isStreaming = true;

  // Render assistant bubble
  const bubble = appendMessage("assistant", "");
  const cursor = document.createElement("span");
  cursor.className = "cursor";
  bubble.appendChild(cursor);

  scrollToBottom();

  let fullText = "";

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: conv.messages }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (!raw) continue;

        let evt;
        try { evt = JSON.parse(raw); } catch { continue; }

        if (evt.type === "delta") {
          fullText += evt.content;
          bubble.innerHTML = marked.parse(fullText);
          bubble.appendChild(cursor);
          scrollToBottom();
        } else if (evt.type === "done") {
          break;
        } else if (evt.type === "error") {
          fullText += `\n\n⚠️ Ошибка: ${evt.message}`;
          bubble.innerHTML = marked.parse(fullText);
          scrollToBottom();
          break;
        }
      }
    }
  } catch (err) {
    fullText = "⚠️ Не удалось подключиться к серверу. Проверьте соединение.";
    bubble.innerHTML = marked.parse(fullText);
    scrollToBottom();
  }

  cursor.remove();
  bubble.innerHTML = marked.parse(fullText);
  scrollToBottom();

  conv.messages.push({ role: "assistant", content: fullText });
  saveConversations();

  isStreaming = false;
  sendBtn.disabled = userInput.value.trim() === "";
}

/* ── Render message ── */
function appendMessage(role, content) {
  const msg = document.createElement("div");
  msg.className = `message ${role}`;

  const inner = document.createElement("div");
  inner.className = "message-inner";

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  if (role === "user") {
    bubble.textContent = content;
  } else {
    bubble.innerHTML = content ? marked.parse(content) : "";
  }

  inner.appendChild(bubble);
  msg.appendChild(inner);
  messagesEl.appendChild(msg);
  return bubble;
}

/* ── History ── */
function renderHistory() {
  if (conversations.length === 0) {
    chatHistory.innerHTML = '<p class="history-empty">История чатов появится здесь</p>';
    return;
  }

  chatHistory.innerHTML = "";
  conversations.forEach((conv) => {
    const item = document.createElement("div");
    item.className = "history-item" + (conv.id === currentConvId ? " active" : "");
    item.textContent = conv.title;
    item.title = conv.title;
    item.addEventListener("click", () => loadConversation(conv.id));
    chatHistory.appendChild(item);
  });
}

function loadConversation(id) {
  currentConvId = id;
  const conv = getConv();
  if (!conv) return;

  welcome.style.display = "none";
  messagesEl.style.display = "flex";
  messagesEl.innerHTML = "";

  conv.messages.forEach(({ role, content }) => {
    appendMessage(role, content);
  });

  renderHistory();
  scrollToBottom();

  if (window.innerWidth <= 768) {
    sidebar.classList.remove("open");
    hideOverlay();
  }
}

function getConv() {
  return conversations.find((c) => c.id === currentConvId);
}

function saveConversations() {
  localStorage.setItem("conversations", JSON.stringify(conversations));
}

/* ── Scroll ── */
function scrollToBottom() {
  chatArea.scrollTop = chatArea.scrollHeight;
}

/* ── Copy code ── */
function copyCode(btn) {
  const code = btn.closest(".code-block").querySelector("code").innerText;
  navigator.clipboard.writeText(code).then(() => {
    btn.classList.add("copied");
    btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Скопировано`;
    setTimeout(() => {
      btn.classList.remove("copied");
      btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Копировать`;
    }, 2000);
  });
}

/* ── Init ── */
renderHistory();
userInput.focus();
