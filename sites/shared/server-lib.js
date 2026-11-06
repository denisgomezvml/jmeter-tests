const http = require("http");
const fs = require("fs");
const path = require("path");

const validPassword = "Passw0rd!";
const userCount = 50;

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".html": "text/html; charset=utf-8",
};

function isValidUser(username, password) {
  const match = /^user(\d{2})$/.exec(username || "");
  if (!match) return false;
  const index = Number(match[1]);
  return index >= 1 && index <= userCount && password === validPassword;
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => resolve(data));
  });
}

function parseCredentials(body, contentType) {
  if ((contentType || "").includes("application/json")) {
    try {
      return JSON.parse(body);
    } catch (error) {
      return {};
    }
  }
  return Object.fromEntries(new URLSearchParams(body));
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function sendText(res, status, type, body) {
  res.writeHead(status, {
    "Content-Type": type,
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function createApp({ port, name, pages, apiRoutes, assets, loginHandler }) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const pathname = url.pathname;

    if (pathname === "/health") {
      return sendJson(res, 200, { status: "ok", site: name });
    }

    if (pathname === "/api/login" && req.method === "POST") {
      const body = await readBody(req);
      const credentials = parseCredentials(body, req.headers["content-type"]);
      if (!isValidUser(credentials.username, credentials.password)) {
        return sendJson(res, 401, { ok: false, error: "invalid credentials" });
      }
      const token = loginHandler(credentials.username);
      return sendJson(res, 200, {
        ok: true,
        token,
        displayName: credentials.username,
        site: name,
      });
    }

    if (apiRoutes[pathname]) {
      return apiRoutes[pathname](req, res, url);
    }

    if (pages[pathname]) {
      return sendText(res, 200, mimeTypes[".html"], pages[pathname](url));
    }

    if (assets[pathname]) {
      const asset = assets[pathname];
      return sendText(res, 200, asset.type, asset.body());
    }

    return sendJson(res, 404, { error: "not found" });
  });

  server.listen(port, "0.0.0.0", () => {
    process.stdout.write(`${name} listening on ${port}\n`);
  });

  return server;
}

function loadThemeAsset(themePath) {
  const body = fs.readFileSync(path.resolve(themePath), "utf8");
  return { type: mimeTypes[".css"], body: () => body };
}

function loginPage(title, scriptPath) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title} - Sign in</title>
<link rel="stylesheet" href="/static/theme.css">
</head>
<body>
<form class="login" id="login-form">
<h1>Sign in to ${title}</h1>
<label for="username">Username</label>
<input id="username" name="username" autocomplete="username">
<label for="password">Password</label>
<input id="password" name="password" type="password" autocomplete="current-password">
<button type="submit">Sign in</button>
<div class="status" id="status"></div>
</form>
<script src="${scriptPath}"></script>
</body>
</html>`;
}

module.exports = {
  createApp,
  loadThemeAsset,
  loginPage,
  sendJson,
  mimeTypes,
};
