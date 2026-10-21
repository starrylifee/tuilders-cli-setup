// 도구별 정보 (설치 명령은 2026-10-21 각 공식 문서 기준)
const TOOLS = {
  claude: {
    name: "Claude Code", maker: "Anthropic", who: "Claude Pro·Max 구독자",
    install: "curl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd",
    bin: "%USERPROFILE%\\.local\\bin",
    exe: "C:\\Users\\이름\\.local\\bin\\claude.exe",
    run: "claude",
    first: ["화면 테마 고르기", "Claude 구독 계정으로 로그인 선택", "브라우저에서 로그인 → 승인"],
    npm: "npm install -g @anthropic-ai/claude-code",
  },
  codex: {
    name: "Codex CLI", maker: "OpenAI", who: "ChatGPT Plus 이상 구독자",
    install: 'powershell -ExecutionPolicy ByPass -c "irm https://chatgpt.com/codex/install.ps1 | iex"',
    bin: "%LOCALAPPDATA%\\Programs\\OpenAI\\Codex\\bin",
    exe: "C:\\Users\\이름\\AppData\\Local\\Programs\\OpenAI\\Codex\\bin\\codex.exe",
    run: "codex",
    first: ["Sign in with ChatGPT 선택", "브라우저에서 ChatGPT 로그인", "이 폴더를 믿는지 물으면 허용"],
    npm: "npm install -g @openai/codex",
  },
  agy: {
    name: "agy", maker: "Google Antigravity", who: "Google AI 구독자, 구독이 없는 분",
    install: "curl -fsSL https://antigravity.google/cli/install.cmd -o install.cmd && install.cmd && del install.cmd",
    bin: "%LOCALAPPDATA%\\agy\\bin",
    exe: "C:\\Users\\이름\\AppData\\Local\\agy\\bin\\agy.exe",
    run: "agy",
    first: ["색상·화면 방식 고르기", "브라우저가 열리면 Google 로그인", "이 폴더를 믿는지 물으면 허용"],
    npm: null,
  },
};
const ORDER = ["claude", "codex", "agy"];
const NODE = { bin: "C:\\Program Files\\nodejs", exe: "C:\\Program Files\\nodejs\\node.exe" };
const TABS = ["intro", "s1", "s2", "s3", "s4", "s5", "help", "done"];

// 브라우저 저장은 편의용 — 막혀 있어도 화면은 정상 동작
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* 무시 */ } },
};

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// ── 명령어 상자 + 복사 ───────────────────────────────
function cmdBox(cmd) {
  return `<div class="cmd" data-cmd="${esc(cmd)}"></div>`;
}
function hydrateCmds(root = document) {
  $$(".cmd:not(.ready)", root).forEach((el) => {
    const cmd = el.dataset.cmd;
    el.classList.add("ready");
    el.innerHTML = `<span class="cmd-prompt" aria-hidden="true">&gt;</span><code class="cmd-text">${esc(cmd)}</code>` +
      `<button class="copy" type="button" aria-label="명령어 복사">복사</button>`;
  });
}
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}
let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
}
document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".copy");
  if (!btn) return;
  const cmd = btn.closest(".cmd").dataset.cmd;
  const ok = await copyText(cmd);
  btn.textContent = ok ? "복사됨 ✓" : "직접 복사";
  btn.classList.toggle("done", ok);
  toast(ok ? "복사했어요. cmd에 붙여넣고 Enter" : "복사가 막혀 있어요. 명령어를 드래그해서 복사하세요");
  setTimeout(() => { btn.textContent = "복사"; btn.classList.remove("done"); }, 1800);
});

// ── 구독(도구) 고르기 ───────────────────────────────
let tool = store.get("tool");
if (!TOOLS[tool]) tool = null;

function chosen() { return tool ? [tool] : ORDER; }

function render() {
  $$(".opt").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.tool === tool)));
  $$(".pick").forEach((b) => b.classList.toggle("on", b.dataset.tool === tool));
  $("#chooserHint").innerHTML = tool
    ? `<b>${TOOLS[tool].name}</b> 명령어만 보여 드려요. <button class="link" id="showAll">전부 보기</button>`
    : "하나를 고르면 그 도구의 명령어만 보입니다.";

  const list = chosen();
  // STEP 3 설치
  $("#installSlot").innerHTML = list.map((k) => {
    const t = TOOLS[k];
    return `<div class="tool-block"><div class="tool-h"><b>${t.name}</b><span class="muted">${t.maker} · ${t.who}</span></div>${cmdBox(t.install)}</div>`;
  }).join("");
  // STEP 4 확인
  $("#whereSlot").innerHTML = list.map((k) => cmdBox(`where ${TOOLS[k].run}`)).join("") + cmdBox("where node");
  $("#pathSlot").textContent = list.map((k) => TOOLS[k].exe).concat(NODE.exe).join("\n");
  const v = tool ? TOOLS[tool].run : "claude";
  $("#versionSlot").innerHTML = `버전까지 보려면 <code>${v} --version</code>${tool ? "" : "처럼 내 도구 이름 뒤에 <code>--version</code>"} → 숫자가 나오면 정상`;
  // STEP 5 실행
  $("#runSlot").className = "cols " + (list.length === 1 ? "one" : "three");
  $("#runSlot").innerHTML = list.map((k) => {
    const t = TOOLS[k];
    return `<div class="card run"><div class="run-h"><span>${t.name}</span></div>${cmdBox(t.run)}` +
      `<p class="muted small-h">처음 실행하면</p><ul class="dots">${t.first.map((f) => `<li>${f}</li>`).join("")}</ul></div>`;
  }).join("");
  // 막혔을 때: PATH 폴더, npm 대안
  $("#folderSlot").innerHTML = list.map((k) => `<div class="folder"><span class="folder-tag">${TOOLS[k].run}</span>${cmdBox(TOOLS[k].bin)}</div>`).join("") +
    `<div class="folder"><span class="folder-tag">node</span>${cmdBox(NODE.bin)}</div>`;
  const npm = list.filter((k) => TOOLS[k].npm);
  $("#npmSlot").innerHTML = npm.length
    ? npm.map((k) => cmdBox(TOOLS[k].npm)).join("")
    : `<p class="muted">agy는 npm 설치가 없습니다. 다른 네트워크에서 다시 시도해 주세요.</p>`;
  // 최종 확인
  $("#verCode").textContent = `${v} --version`;
  hydrateCmds();
}

function choose(k) {
  tool = TOOLS[k] ? k : null;
  store.set("tool", tool || "");
  render();
}
$$(".opt, .pick").forEach((b) => b.addEventListener("click", () => {
  choose(b.dataset.tool);
}));
document.addEventListener("click", (e) => { if (e.target.id === "showAll") choose(null); });

// ── 탭 ─────────────────────────────────────────────
let current = "intro";
function show(id, push = true) {
  if (!TABS.includes(id)) id = "intro";
  current = id;
  $$(".tabs [role=tab]").forEach((b) => {
    const on = b.dataset.tab === id;
    b.setAttribute("aria-selected", String(on));
    b.tabIndex = on ? 0 : -1;
    if (on) b.scrollIntoView({ block: "nearest", inline: "nearest" });
  });
  $$(".panel").forEach((p) => p.classList.toggle("active", p.id === id));
  const i = TABS.indexOf(id);
  $("#prevBtn").disabled = i === 0;
  $("#nextBtn").textContent = i === TABS.length - 1 ? "처음으로" : (TABS[i + 1] === "help" ? "최종 확인 →" : "다음 →");
  if (push) history.replaceState(null, "", "#" + id);
}
function step(d) {
  let i = TABS.indexOf(current) + d;
  // '다음'으로 갈 때 '막혔을 때'는 건너뜀 (필요할 때만 들어가는 탭)
  if (TABS[i] === "help") i += d;
  if (i >= TABS.length) i = 0;
  if (i < 0) i = 0;
  show(TABS[i]);
  window.scrollTo({ top: 0, behavior: "smooth" });
}
$$(".tabs [role=tab]").forEach((b) => b.addEventListener("click", () => show(b.dataset.tab)));
document.addEventListener("click", (e) => {
  const go = e.target.closest("[data-go]");
  if (go) { show(go.dataset.go); window.scrollTo({ top: 0, behavior: "smooth" }); }
});
$("#prevBtn").addEventListener("click", () => step(-1));
$("#nextBtn").addEventListener("click", () => step(1));
$(".tabs").addEventListener("keydown", (e) => {
  if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
  const i = TABS.indexOf(current) + (e.key === "ArrowRight" ? 1 : -1);
  if (i < 0 || i >= TABS.length) return;
  show(TABS[i]);
  $(`.tabs [data-tab=${TABS[i]}]`).focus();
});

// ── 체크리스트 (브라우저에만 저장) ─────────────────
$$("#checklist input").forEach((c) => {
  c.checked = store.get("chk-" + c.dataset.key) === "1";
  c.addEventListener("change", () => store.set("chk-" + c.dataset.key, c.checked ? "1" : "0"));
});

render();
show(location.hash.slice(1) || "intro", false);
window.addEventListener("hashchange", () => show(location.hash.slice(1), false));
