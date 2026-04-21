const GITLAB_PATTERN = /^https?:\/\/[^/]+\/.+\/-\/merge_requests\/\d+(\/.*)?$/;
const GITHUB_PATTERN = /^https?:\/\/[^/]+\/[^/]+\/[^/]+\/pull\/\d+(\/.*)?$/;
const JIRA_PATTERN = /^https?:\/\/[^/]+\.atlassian\.net\/(browse|jira\/browse)\/[A-Z][A-Z0-9]+-\d+(\/.*)?$/;

function detectPlatform(url) {
  if (GITLAB_PATTERN.test(url)) return "gitlab";
  if (GITHUB_PATTERN.test(url)) return "github";
  if (JIRA_PATTERN.test(url)) return "jira";
  return null;
}

const BADGE_CONFIG = {
  gitlab: "MR",
  github: "PR",
  jira: "JIRA",
};

function updateBadge(tabId, url) {
  const platform = detectPlatform(url);
  if (platform) {
    chrome.action.setBadgeText({ text: BADGE_CONFIG[platform], tabId });
    chrome.action.setBadgeBackgroundColor({ color: "#6c63ff", tabId });
  } else {
    chrome.action.setBadgeText({ text: "", tabId });
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    updateBadge(tabId, changeInfo.url);
  }
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab.url) updateBadge(tabId, tab.url);
  } catch {
    // tab may have closed
  }
});
