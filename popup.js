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

function parseUrl(url) {
  const gl = url.match(GITLAB_PATTERN);
  if (gl) {
    return { platform: "gitlab", base: gl[1], number: gl[2], label: `MR !${gl[2]}` };
  }

  const gh = url.match(GITHUB_PATTERN);
  if (gh) {
    return { platform: "github", base: gh[1], number: gh[3], repo: gh[2], label: `PR #${gh[3]}` };
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
// Core actions
// ---------------------------------------------------------------------------

let cachedDiff = null;
let currentBase = null;

async function fetchDiff(parsed) {
  if (cachedDiff && currentBase === parsed.base) return cachedDiff;

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

  cachedDiff = text;
  currentBase = parsed.base;
  return text;
}

async function handleAction(parsed, action) {
  showState("loading");
  try {
    const diff = await fetchDiff(parsed);

    if (action === "copy") {
      await navigator.clipboard.writeText(diff);
    } else {
      downloadFile(diff, parsed);
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
  if (parsed.platform === "github") {
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
    cachedDiff = null;
    handleAction(parsed, "copy");
  });
}

init();
