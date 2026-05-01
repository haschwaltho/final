/* ── i18n ── */
const TRANSLATIONS = {
  ru: {
    new_chat:               "Новый чат",
    projects_label:         "Проекты",
    new_project:            "Новый проект",
    history_empty:          "История чатов появится здесь",
    clear_history:          "Очистить историю",
    agent_label:            "AI Agent",
    welcome_title:          "Чем могу помочь?",
    suggestion_exam:        "Подготовься к экзамену",
    suggestion_exam_text:   "Составь план подготовки к экзамену по физике за 3 дня",
    suggestion_explain:     "Объясни тему с примером",
    suggestion_explain_text:"Объясни производную функции простыми словами с примером",
    suggestion_stress:      "Как справиться со стрессом",
    suggestion_stress_text: "Как справиться со стрессом и тревогой перед экзаменами?",
    suggestion_scholarships:"Найди стипендии для студентов",
    suggestion_scholarships_text:"Какие стипендии доступны для студентов в 2025 году?",
    input_placeholder:      "Напишите сообщение...",
    disclaimer:             "AI может ошибаться. Проверяйте важную информацию.",
    no_chats:               "Нет чатов",
    project_name_placeholder:"Название проекта",
    delete_chat:            "Удалить чат",
    delete_project:         "Удалить проект",
    copy_btn:               "Копировать",
    copied_btn:             "Скопировано",
    copied_toast:           "Скопировано в буфер!",
    history_cleared_toast:  "История очищена",
    error_server:           "Не удалось подключиться к серверу. Проверьте соединение.",
    default_project_name:   "Новый проект",
  },
  en: {
    new_chat:               "New Chat",
    projects_label:         "Projects",
    new_project:            "New Project",
    history_empty:          "Chat history will appear here",
    clear_history:          "Clear History",
    agent_label:            "AI Agent",
    welcome_title:          "How can I help?",
    suggestion_exam:        "Prepare for an exam",
    suggestion_exam_text:   "Make a 3-day study plan for a physics exam",
    suggestion_explain:     "Explain a topic with an example",
    suggestion_explain_text:"Explain derivatives in simple terms with an example",
    suggestion_stress:      "Handle exam stress",
    suggestion_stress_text: "How to manage stress and anxiety before exams?",
    suggestion_scholarships:"Find scholarships for students",
    suggestion_scholarships_text:"What scholarships are available for students in 2025?",
    input_placeholder:      "Write a message...",
    disclaimer:             "AI can make mistakes. Verify important information.",
    no_chats:               "No chats",
    project_name_placeholder:"Project name",
    delete_chat:            "Delete chat",
    delete_project:         "Delete project",
    copy_btn:               "Copy",
    copied_btn:             "Copied",
    copied_toast:           "Copied to clipboard!",
    history_cleared_toast:  "History cleared",
    error_server:           "Could not connect to the server. Check your connection.",
    default_project_name:   "New Project",
  },
  kk: {
    new_chat:               "Жаңа чат",
    projects_label:         "Жобалар",
    new_project:            "Жаңа жоба",
    history_empty:          "Чат тарихы осында пайда болады",
    clear_history:          "Тарихты тазалау",
    agent_label:            "AI Агент",
    welcome_title:          "Қалай көмектесе аламын?",
    suggestion_exam:        "Емтиханға дайындал",
    suggestion_exam_text:   "Физика бойынша емтиханға 3 күнде дайындалу жоспарын жаса",
    suggestion_explain:     "Тақырыпты мысалмен түсіндір",
    suggestion_explain_text:"Функция туындысын қарапайым тілмен мысалмен түсіндір",
    suggestion_stress:      "Стрессті қалай жеңуге болады",
    suggestion_stress_text: "Емтихан алдындағы стресс пен алаңдаушылықты қалай жеңуге болады?",
    suggestion_scholarships:"Студенттерге стипендия тап",
    suggestion_scholarships_text:"2025 жылы студенттерге қандай стипендиялар бар?",
    input_placeholder:      "Хабарлама жазыңыз...",
    disclaimer:             "AI қателесуі мүмкін. Маңызды ақпаратты тексеріңіз.",
    no_chats:               "Чаттар жоқ",
    project_name_placeholder:"Жоба атауы",
    delete_chat:            "Чатты жою",
    delete_project:         "Жобаны жою",
    copy_btn:               "Көшіру",
    copied_btn:             "Көшірілді",
    copied_toast:           "Алмасу буферіне көшірілді!",
    history_cleared_toast:  "Тарих тазаланды",
    error_server:           "Серверге қосылу мүмкін болмады. Байланысыңызды тексеріңіз.",
    default_project_name:   "Жаңа жоба",
  },
};

const LANG_FLAGS = { ru: "🇷🇺", en: "🇬🇧", kk: "🇰🇿" };
let currentLang = localStorage.getItem("lang") || "ru";

function t(key) {
  return (TRANSLATIONS[currentLang] || TRANSLATIONS.ru)[key] || key;
}

function applyLang() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll(".suggestion-card").forEach((card) => {
    if (card.dataset.i18nText) card.dataset.text = t(card.dataset.i18nText);
  });
  const flagEl = document.getElementById("langFlag");
  if (flagEl) flagEl.textContent = LANG_FLAGS[currentLang] || "🌐";
  document.querySelectorAll(".lang-option").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === currentLang);
  });
}

/* ── Marked.js config ── */
marked.setOptions({ breaks: true, gfm: true, highlight: null });

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
        ${t("copy_btn")}
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
let projects = JSON.parse(localStorage.getItem("projects") || "[]");
let currentConvId = null;
let currentProjectId = null;
let expandedProjects = new Set(JSON.parse(localStorage.getItem("expandedProjects") || "[]"));
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
      projectId: currentProjectId || null,
    });
    saveConversations();
    renderHistory();
    if (currentProjectId) renderProjects();
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
          fullText += `\n\n⚠️ ${evt.message}`;
          bubble.innerHTML = marked.parse(fullText);
          scrollToBottom();
          break;
        }
      }
    }
  } catch (err) {
    if (err.name !== "AbortError") {
      fullText = fullText
        ? fullText + "\n\n⚠️ " + t("error_server")
        : "⚠️ " + t("error_server");
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
function buildConvItem(conv) {
  const item = document.createElement("div");
  item.className = "history-item" + (conv.id === currentConvId ? " active" : "");

  const title = document.createElement("span");
  title.className = "history-item-title";
  title.textContent = conv.title;
  title.title = conv.title;
  title.addEventListener("click", () => loadConversation(conv.id));

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "history-item-delete";
  deleteBtn.title = t("delete_chat");
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
  return item;
}

function renderHistory() {
  const unorganized = conversations.filter((c) => !c.projectId);

  if (unorganized.length === 0) {
    chatHistory.innerHTML = `<p class="history-empty">${t("history_empty")}</p>`;
    return;
  }

  chatHistory.innerHTML = "";
  unorganized.forEach((conv) => chatHistory.appendChild(buildConvItem(conv)));
}

/* ── Projects ── */
function saveProjects() {
  localStorage.setItem("projects", JSON.stringify(projects));
}

function saveExpandedProjects() {
  localStorage.setItem("expandedProjects", JSON.stringify([...expandedProjects]));
}

function renderProjects() {
  const container = document.getElementById("projectsList");
  container.innerHTML = "";

  projects.forEach((project) => {
    const projectConvs = conversations.filter((c) => c.projectId === project.id);
    const isExpanded = expandedProjects.has(project.id);

    const item = document.createElement("div");
    item.className = "project-item" + (isExpanded ? " expanded" : "");

    const header = document.createElement("div");
    header.className = "project-item-header" + (currentProjectId === project.id ? " active" : "");

    const chevron = document.createElement("span");
    chevron.className = "project-chevron";
    chevron.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>`;

    const icon = document.createElement("span");
    icon.className = "project-icon";
    icon.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`;

    const name = document.createElement("span");
    name.className = "project-name";
    name.textContent = project.name;

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "history-item-delete";
    deleteBtn.title = t("delete_project");
    deleteBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>`;
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteProject(project.id);
    });

    header.appendChild(chevron);
    header.appendChild(icon);
    header.appendChild(name);
    header.appendChild(deleteBtn);
    header.addEventListener("click", () => toggleProject(project.id));

    const chatsDiv = document.createElement("div");
    chatsDiv.className = "project-chats";

    if (projectConvs.length === 0) {
      const empty = document.createElement("p");
      empty.className = "project-chats-empty";
      empty.textContent = t("no_chats");
      chatsDiv.appendChild(empty);
    } else {
      projectConvs.forEach((conv) => chatsDiv.appendChild(buildConvItem(conv)));
    }

    item.appendChild(header);
    item.appendChild(chatsDiv);
    container.appendChild(item);
  });
}

function toggleProject(id) {
  if (expandedProjects.has(id)) {
    expandedProjects.delete(id);
    if (currentProjectId === id) currentProjectId = null;
  } else {
    expandedProjects.add(id);
    currentProjectId = id;
  }
  saveExpandedProjects();
  renderProjects();
}

function createProject(name) {
  const project = { id: Date.now().toString(), name: name || t("default_project_name") };
  projects.unshift(project);
  saveProjects();
  expandedProjects.add(project.id);
  currentProjectId = project.id;
  saveExpandedProjects();
  renderProjects();
}

function deleteProject(id) {
  conversations.forEach((c) => { if (c.projectId === id) c.projectId = null; });
  saveConversations();
  projects = projects.filter((p) => p.id !== id);
  saveProjects();
  if (currentProjectId === id) currentProjectId = null;
  expandedProjects.delete(id);
  saveExpandedProjects();
  renderProjects();
  renderHistory();
}

function showNewProjectInput() {
  const container = document.getElementById("projectsList");
  const existing = container.querySelector(".project-new-row");
  if (existing) { existing.querySelector("input").focus(); return; }

  const row = document.createElement("div");
  row.className = "project-item-header project-new-row";

  const icon = document.createElement("span");
  icon.className = "project-icon";
  icon.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`;
  icon.style.color = "var(--accent)";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "project-name-input";
  input.placeholder = t("project_name_placeholder");
  input.maxLength = 60;

  row.appendChild(icon);
  row.appendChild(input);
  container.prepend(row);
  input.focus();

  let confirmed = false;
  function confirm() {
    if (confirmed) return;
    confirmed = true;
    const name = input.value.trim();
    row.remove();
    if (name) createProject(name);
  }

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); confirm(); }
    if (e.key === "Escape") { confirmed = true; row.remove(); }
  });
  input.addEventListener("blur", confirm);
}

document.getElementById("newProjectBtn").addEventListener("click", showNewProjectInput);

function deleteConversation(id) {
  const had_project = conversations.find((c) => c.id === id)?.projectId;
  conversations = conversations.filter((c) => c.id !== id);
  saveConversations();
  if (currentConvId === id) {
    currentConvId = null;
    messagesEl.innerHTML = "";
    welcome.style.display = "flex";
    messagesEl.style.display = "none";
  }
  renderHistory();
  if (had_project) renderProjects();
}

function clearAllHistory() {
  conversations = [];
  saveConversations();
  currentConvId = null;
  messagesEl.innerHTML = "";
  welcome.style.display = "flex";
  messagesEl.style.display = "none";
  renderHistory();
  showToast(t("history_cleared_toast"));
}

function loadConversation(id) {
  currentConvId = id;
  const conv = getConv();
  if (!conv) return;

  currentProjectId = conv.projectId || null;

  welcome.style.display = "none";
  messagesEl.style.display = "flex";
  messagesEl.innerHTML = "";

  conv.messages.forEach(({ role, content }) => {
    appendMessage(role, content);
  });

  renderHistory();
  renderProjects();
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
    showToast(t("copied_toast"));
    btn.classList.add("copied");
    btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> ${t("copied_btn")}`;
    setTimeout(() => {
      btn.classList.remove("copied");
      btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> ${t("copy_btn")}`;
    }, 2000);
  });
}

/* ── Language selector ── */
document.getElementById("langBtn").addEventListener("click", (e) => {
  e.stopPropagation();
  document.getElementById("langDropdown").classList.toggle("open");
});

document.querySelectorAll(".lang-option").forEach((btn) => {
  btn.addEventListener("click", () => {
    currentLang = btn.dataset.lang;
    localStorage.setItem("lang", currentLang);
    document.getElementById("langDropdown").classList.remove("open");
    applyLang();
    renderHistory();
    renderProjects();
  });
});

document.addEventListener("click", () => {
  document.getElementById("langDropdown")?.classList.remove("open");
});

/* ── Init ── */
document.getElementById("clearHistoryBtn").addEventListener("click", clearAllHistory);

applyLang();
renderProjects();
renderHistory();
userInput.focus();
