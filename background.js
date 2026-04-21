const GITLAB_PATTERN = /^https?:\/\/[^/]+\/.+\/-\/merge_requests\/\d+(\/.*)?$/;
const GITHUB_PATTERN = /^https?:\/\/[^/]+\/[^/]+\/[^/]+\/pull\/\d+(\/.*)?$/;

function detectPlatform(url) {
  if (GITLAB_PATTERN.test(url)) return "gitlab";
  if (GITHUB_PATTERN.test(url)) return "github";
  return null;
}

function updateBadge(tabId, url) {
  const platform = detectPlatform(url);
  if (platform === "gitlab") {
    chrome.action.setBadgeText({ text: "MR", tabId });
    chrome.action.setBadgeBackgroundColor({ color: "#6c63ff", tabId });
  } else if (platform === "github") {
    chrome.action.setBadgeText({ text: "PR", tabId });
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
