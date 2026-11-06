const form = document.getElementById("login-form");
const status = document.getElementById("status");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {
    username: document.getElementById("username").value,
    password: document.getElementById("password").value,
  };
  const response = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  status.className = response.ok ? "status ok" : "status error";
  status.textContent = response.ok ? `Welcome ${data.displayName}` : "Invalid credentials";
  if (response.ok) {
    window.location.href = "/";
  }
});
