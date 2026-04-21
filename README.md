# diff-sender

Chrome extension to copy merge request diffs and Jira ticket details to your clipboard or download them as text files — optimized for pasting into LLMs.

## How It Works

### GitLab / GitHub

When you're on a merge request or pull request page, the extension:

1. Detects the MR/PR URL and shows a badge on the extension icon
2. Fetches the raw diff (e.g. `merge_requests/113.diff`)
3. Lets you **copy** the diff to your clipboard or **download** it as a `.diff` file

### Jira

When you're on an Atlassian Jira ticket page, the extension:

1. Detects the issue key and shows a **"JIRA"** badge on the extension icon
2. Fetches the ticket via the Jira REST API v3 (summary, description, and comments)
3. Converts the Atlassian Document Format (ADF) response into clean, readable plain text
4. Lets you **copy** the ticket details or **download** them as a `.txt` file

Supported ADF elements include panels, ordered/bullet/task lists, tables, code blocks, mentions, emoji, inline cards, blockquotes, and more.

You can then paste the content into ChatGPT, Claude, or any other LLM for review.

## Install (Developer Mode)

1. Clone this repo:
   ```
   git clone https://github.com/your-user/diff-sender.git
   ```
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top-right)
4. Click **Load unpacked** and select the `diff-sender` folder
5. Pin the extension from the puzzle-piece menu for quick access

## Usage

1. Navigate to any supported page:
   - GitLab MR (e.g. `https://gitlab.com/group/project/-/merge_requests/113`)
   - GitHub PR (e.g. `https://github.com/owner/repo/pull/42`)
   - Jira ticket (e.g. `https://your-org.atlassian.net/browse/PROJ-123`)
2. Click the **Diff Sender** extension icon
3. Choose **Copy to Clipboard** or **Download**
4. Paste the content into your preferred LLM

## Supported Platforms

- **GitLab** (gitlab.com and self-hosted instances)
- **GitHub** (github.com)
- **Jira** (Atlassian Cloud — `*.atlassian.net`)

## Permissions

- `activeTab` — read the URL of the current tab when you click the extension
- `clipboardWrite` — copy content to your clipboard

No data is collected or sent anywhere. Content is fetched directly from the source using your existing session cookies.

## Project Structure

```
diff-sender/
├── manifest.json      # Extension manifest (V3)
├── popup.html         # Extension popup UI
├── popup.css          # Popup styles
├── popup.js           # Popup logic (fetch, copy, download)
├── background.js      # Badge management (MR/PR/JIRA detection)
├── content.js         # Content script (placeholder for future enhancements)
├── icons/             # Extension icons (16, 48, 128)
└── README.md
```
