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

/* ── Icon templates ── */
const SEND_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`;
const STOP_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="3"/></svg>`;

/* ── State ── */
let conversations = JSON.parse(localStorage.getItem("conversations") || "[]");
let currentConvId = null;
let isStreaming = false;
let abortController = null;

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

/* ── Scroll-to-bottom button ── */
const scrollToBottomBtn = document.getElementById("scrollToBottom");
chatArea.addEventListener("scroll", () => {
  const nearBottom = chatArea.scrollHeight - chatArea.scrollTop - chatArea.clientHeight < 100;
  scrollToBottomBtn.classList.toggle("visible", !nearBottom);
});
scrollToBottomBtn.addEventListener("click", scrollToBottom);

/* ── Toast ── */
function showToast(message) {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 2100);
}

/* ── Input handling ── */
userInput.addEventListener("input", () => {
  adjustHeight();
  if (!isStreaming) sendBtn.disabled = userInput.value.trim() === "";
});

userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    if (!isStreaming && !sendBtn.disabled) sendMessage();
  }
});

function adjustHeight() {
  userInput.style.height = "auto";
  userInput.style.height = Math.min(userInput.scrollHeight, 200) + "px";
}

/* ── Send / Stop ── */
sendBtn.addEventListener("click", () => {
  if (isStreaming) {
    abortController?.abort();
  } else {
    sendMessage();
  }
});

async function sendMessage() {
  const text = userInput.value.trim();
  if (!text || isStreaming) return;

  welcome.style.display = "none";
  messagesEl.style.display = "flex";

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

  appendMessage("user", text);

  userInput.value = "";
  userInput.style.height = "auto";
  isStreaming = true;
  abortController = new AbortController();
  sendBtn.disabled = false;
  sendBtn.classList.add("stop");
  sendBtn.innerHTML = STOP_ICON;

  const bubble = appendMessage("assistant", "");
  const typingEl = document.createElement("div");
  typingEl.className = "typing-dots";
  typingEl.innerHTML = "<span></span><span></span><span></span>";
  bubble.appendChild(typingEl);
  const cursor = document.createElement("span");
  cursor.className = "cursor";
  let hasFirstToken = false;

  scrollToBottom();

  let fullText = "";

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: currentConvId,
        messages: conv.messages
      }),
      signal: abortController.signal,
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
          if (!hasFirstToken) {
            hasFirstToken = true;
            typingEl.remove();
            bubble.appendChild(cursor);
          }
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
    if (err.name !== "AbortError") {
      if (fullText) {
        fullText += "\n\n⚠️ Соединение прервано.";
      } else {
        fullText = "⚠️ Не удалось подключиться к серверу. Проверьте соединение.";
      }
    }
  }

  typingEl.remove();
  cursor.remove();

  if (!fullText) {
    bubble.closest(".message")?.remove();
  } else {
    bubble.innerHTML = marked.parse(fullText);
    conv.messages.push({ role: "assistant", content: fullText });
    saveConversations();
  }

  scrollToBottom();
  isStreaming = false;
  abortController = null;
  sendBtn.innerHTML = SEND_ICON;
  sendBtn.classList.remove("stop");
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

    const title = document.createElement("span");
    title.className = "history-item-title";
    title.textContent = conv.title;
    title.title = conv.title;
    title.addEventListener("click", () => loadConversation(conv.id));

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "history-item-delete";
    deleteBtn.title = "Удалить чат";
    deleteBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>`;
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteConversation(conv.id);
    });

    item.appendChild(title);
    item.appendChild(deleteBtn);
    chatHistory.appendChild(item);
  });
}

function deleteConversation(id) {
  conversations = conversations.filter((c) => c.id !== id);
  saveConversations();
  if (currentConvId === id) {
    currentConvId = null;
    messagesEl.innerHTML = "";
    welcome.style.display = "flex";
    messagesEl.style.display = "none";
  }
  renderHistory();
}

function clearAllHistory() {
  conversations = [];
  saveConversations();
  currentConvId = null;
  messagesEl.innerHTML = "";
  welcome.style.display = "flex";
  messagesEl.style.display = "none";
  renderHistory();
  showToast("История очищена");
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
    showToast("Скопировано в буфер!");
    btn.classList.add("copied");
    btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Скопировано`;
    setTimeout(() => {
      btn.classList.remove("copied");
      btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Копировать`;
    }, 2000);
  });
}

/* ── Init ── */
document.getElementById("clearHistoryBtn").addEventListener("click", clearAllHistory);

renderHistory();
userInput.focus();
