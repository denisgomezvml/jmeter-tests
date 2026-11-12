const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createApp, loadThemeAsset, loginPage, sendJson, mimeTypes } = require("./shared/server-lib");

const port = Number(process.env.PORT || 3000);
const title = "VML-QA Lite Site";
const loginScript = fs.readFileSync(path.join(__dirname, "shared", "login.js"), "utf8");

const messages = Array.from({ length: 10 }, (_, index) => ({
  id: index + 1,
  author: `user${String(index + 1).padStart(2, "0")}`,
  text: `Quick update number ${index + 1}`,
}));

function homePage() {
  const cards = messages
    .map(
      (message) =>
        `<div class="card"><div class="meta"><span class="avatar">${message.author.slice(-2)}</span>${message.author}</div>${message.text}</div>`
    )
    .join("");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
<link rel="stylesheet" href="/static/theme.css">
</head>
<body>
<div class="topbar"><span class="brand">${title}</span></div>
<div class="layout">
<div class="content">${cards}</div>
</div>
</body>
</html>`;
}

createApp({
  port,
  name: "light",
  pages: {
    "/": homePage,
    "/login": () => loginPage(title, "/static/login.js"),
  },
  apiRoutes: {
    "/api/messages": (req, res) => sendJson(res, 200, { messages }),
  },
  assets: {
    "/static/theme.css": loadThemeAsset(path.join(__dirname, "shared", "theme.css")),
    "/static/login.js": { type: mimeTypes[".js"], body: () => loginScript },
  },
  loginHandler: (username) => crypto.createHash("sha1").update(username).digest("hex"),
});
