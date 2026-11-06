const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createApp, loadThemeAsset, loginPage, sendJson, mimeTypes } = require("./shared/server-lib");

const port = Number(process.env.PORT || 3000);
const title = "Teams Heavy";
const cardCount = Number(process.env.CARD_COUNT || 600);
const loginScript = fs.readFileSync(path.join(__dirname, "shared", "login.js"), "utf8");

function buildMessage(index) {
  const author = `user${String((index % 50) + 1).padStart(2, "0")}`;
  const digest = crypto.createHash("sha256").update(`message-${index}`).digest("hex");
  return {
    id: index + 1,
    author,
    text: `Project thread ${index + 1}: ${digest} ${digest} ${digest}`,
    reactions: Array.from({ length: 8 }, (_, reaction) => ({ type: reaction, count: (index * reaction) % 17 })),
  };
}

function renderCards(count) {
  let html = "";
  for (let index = 0; index < count; index += 1) {
    const message = buildMessage(index);
    html += `<div class="card"><div class="meta"><span class="avatar">${message.author.slice(-2)}</span>${message.author}</div><p>${message.text}</p><div class="meta">${message.reactions
      .map((reaction) => `<span>r${reaction.type}:${reaction.count}</span>`)
      .join(" ")}</div></div>`;
  }
  return html;
}

function homePage() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
<link rel="stylesheet" href="/static/theme.css">
<script src="/static/vendor.js" defer></script>
</head>
<body>
<div class="topbar"><span class="brand">${title}</span><span class="search">Search</span></div>
<div class="layout">
<div class="rail"><span class="active">Chat</span><span>Teams</span><span>Calendar</span></div>
<div class="channels"><h3>Chat</h3><ul><li class="active">General</li><li>Random</li></ul></div>
<div class="content">${renderCards(cardCount)}</div>
</div>
</body>
</html>`;
}

function buildVendorScript() {
  const chunk = "function module%d(a,b){return a*b+%d;}\n";
  let body = "";
  for (let index = 0; index < 12000; index += 1) {
    body += chunk.replace("%d", index).replace("%d", index);
  }
  return body;
}

const vendorScript = buildVendorScript();

function messagesRoute(req, res, url) {
  const requested = Number(url.searchParams.get("count") || 1500);
  const count = Math.min(Math.max(requested, 1), 5000);
  const messages = Array.from({ length: count }, (_, index) => buildMessage(index));
  sendJson(res, 200, { messages });
}

function digestRoute(req, res) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync("report", salt, 20000, 64, "sha512").toString("hex");
  sendJson(res, 200, { messages: [], digest: hash });
}

createApp({
  port,
  name: "heavy",
  pages: {
    "/": homePage,
    "/login": () => loginPage(title, "/static/login.js"),
  },
  apiRoutes: {
    "/api/messages": messagesRoute,
    "/api/digest": digestRoute,
  },
  assets: {
    "/static/theme.css": loadThemeAsset(path.join(__dirname, "shared", "theme.css")),
    "/static/login.js": { type: mimeTypes[".js"], body: () => loginScript },
    "/static/vendor.js": { type: mimeTypes[".js"], body: () => vendorScript },
  },
  loginHandler: (username) => {
    const salt = crypto.randomBytes(16);
    return crypto.pbkdf2Sync(username, salt, 30000, 32, "sha512").toString("hex");
  },
});
