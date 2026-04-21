const states = {
  detecting: document.getElementById("state-detecting"),
  notMr: document.getElementById("state-not-mr"),
  ready: document.getElementById("state-ready"),
  loading: document.getElementById("state-loading"),
  success: document.getElementById("state-success"),
  error: document.getElementById("state-error"),
};

const mrInfo = document.getElementById("mr-info");
const errorMsg = document.getElementById("error-msg");

function showState(name) {
  Object.entries(states).forEach(([key, el]) => {
    el.classList.toggle("hidden", key !== name);
  });
}

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

const GITLAB_PATTERN = /^(https?:\/\/[^/]+\/.+\/-\/merge_requests\/(\d+))(\/.*)?$/;
const GITHUB_PATTERN = /^(https?:\/\/[^/]+\/([^/]+\/[^/]+)\/pull\/(\d+))(\/.*)?$/;
const JIRA_PATTERN = /^(https?:\/\/[^/]+\.atlassian\.net)\/(browse|jira\/browse)\/([A-Z][A-Z0-9]+-\d+)(\/.*)?$/;

function parseUrl(url) {
  const gl = url.match(GITLAB_PATTERN);
  if (gl) {
    return { platform: "gitlab", base: gl[1], number: gl[2], label: `MR !${gl[2]}` };
  }

  const gh = url.match(GITHUB_PATTERN);
  if (gh) {
    return { platform: "github", base: gh[1], number: gh[3], repo: gh[2], label: `PR #${gh[3]}` };
  }

  const jira = url.match(JIRA_PATTERN);
  if (jira) {
    return { platform: "jira", origin: jira[1], issueKey: jira[3], label: jira[3] };
  }

  return null;
}

function rawDiffUrl(parsed) {
  if (parsed.platform === "gitlab") {
    return parsed.base + ".diff";
  }
  // GitHub: https://github.com/owner/repo/pull/42.diff
  return parsed.base + ".diff";
}

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

let cachedContent = null;
let currentKey = null;

// ---------------------------------------------------------------------------
// Jira helpers
// ---------------------------------------------------------------------------

function adfToPlaintext(node) {
  if (!node) return "";
  if (node.type === "text") return node.text || "";
  if (!node.content) return "";
  return node.content.map(child => {
    const text = adfToPlaintext(child);
    if (child.type === "paragraph" || child.type === "heading") return text + "\n";
    if (child.type === "listItem") return "- " + text + "\n";
    if (child.type === "codeBlock") return "```\n" + text + "\n```\n";
    return text;
  }).join("");
}

function parseDescription(field) {
  if (!field) return "(no description)";
  if (typeof field === "string") return field;
  if (typeof field === "object" && field.type === "doc") return adfToPlaintext(field).trim();
  return String(field);
}

function formatJiraTicket(issueKey, json) {
  const fields = json.fields;
  const lines = [];

  lines.push(`Ticket: ${issueKey}`);
  lines.push(`Title: ${fields.summary || "(untitled)"}`);
  lines.push("");
  lines.push("Description:");
  lines.push(parseDescription(fields.description));

  const comments = fields.comment?.comments || [];
  if (comments.length > 0) {
    lines.push("");
    lines.push("Comments:");
    for (const c of comments) {
      const author = c.author?.displayName || "Unknown";
      const date = (c.created || "").slice(0, 10);
      const body = parseDescription(c.body);
      lines.push(`[${author}, ${date}]: ${body}`);
    }
  }

  return lines.join("\n");
}

async function fetchJiraTicket(parsed) {
  if (cachedContent && currentKey === parsed.issueKey) return cachedContent;

  const url = `${parsed.origin}/rest/api/2/issue/${parsed.issueKey}?fields=summary,description,comment`;
  const resp = await fetch(url, { credentials: "include" });

  if (!resp.ok) {
    throw new Error(`Failed to fetch ticket (HTTP ${resp.status}). Make sure you're logged in to Jira.`);
  }

  const json = await resp.json();
  const text = formatJiraTicket(parsed.issueKey, json);

  cachedContent = text;
  currentKey = parsed.issueKey;
  return text;
}

// ---------------------------------------------------------------------------
// Core actions
// ---------------------------------------------------------------------------

async function fetchContent(parsed) {
  if (parsed.platform === "jira") {
    return fetchJiraTicket(parsed);
  }

  if (cachedContent && currentKey === parsed.base) return cachedContent;

  const url = rawDiffUrl(parsed);
  const resp = await fetch(url, { credentials: "include" });

  if (!resp.ok) {
    const platformName = parsed.platform === "github" ? "GitHub" : "GitLab";
    throw new Error(`Failed to fetch diff (HTTP ${resp.status}). Make sure you're logged in to ${platformName}.`);
  }

  const text = await resp.text();
  if (!text.trim()) {
    throw new Error("Diff is empty — the PR/MR may have no changes.");
  }

  cachedContent = text;
  currentKey = parsed.base;
  return text;
}

async function handleAction(parsed, action) {
  showState("loading");
  try {
    const content = await fetchContent(parsed);

    if (action === "copy") {
      await navigator.clipboard.writeText(content);
    } else {
      downloadFile(content, parsed);
    }

    showState("success");
    setTimeout(() => showState("ready"), 1800);
  } catch (err) {
    errorMsg.textContent = err.message;
    showState("error");
  }
}

function downloadFile(content, parsed) {
  let filename;
  if (parsed.platform === "jira") {
    filename = `${parsed.issueKey}.txt`;
  } else if (parsed.platform === "github") {
    const slug = parsed.repo.replace("/", "-");
    filename = `${slug}-pr-${parsed.number}.diff`;
  } else {
    const parts = parsed.base.split("/");
    const project = parts.slice(3, -3).join("-");
    filename = `${project}-mr-${parsed.number}.diff`;
  }

  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) {
    showState("notMr");
    return;
  }

  const parsed = parseUrl(tab.url);
  if (!parsed) {
    showState("notMr");
    return;
  }

  mrInfo.textContent = `${parsed.label} detected`;
  showState("ready");

  document.getElementById("btn-copy").addEventListener("click", () => {
    handleAction(parsed, "copy");
  });

  document.getElementById("btn-download").addEventListener("click", () => {
    handleAction(parsed, "download");
  });

  document.getElementById("btn-retry").addEventListener("click", () => {
    cachedContent = null;
    currentKey = null;
    handleAction(parsed, "copy");
  });
}

init();
