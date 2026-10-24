(() => {
  const cfg = window.ABADIR_CONFIG || {};
  const API = (cfg.API_BASE || "").replace(/\/$/, "");
  const $ = id => document.getElementById(id);
  const body = document.body, themeBtn = $("themeBtn"), langBtn = $("langBtn");
  const menuBtn = $("menuBtn"), navLinks = $("navLinks");
  function setTheme(t) {
    body.classList.toggle("dark", t === "dark");
    if (themeBtn) themeBtn.textContent = t === "dark" ? "☀" : "☾";
    localStorage.setItem("academy-theme", t);
  }
  setTheme(localStorage.getItem("academy-theme") || "light");
  if (themeBtn) themeBtn.onclick = () => setTheme(body.classList.contains("dark") ? "light" : "dark");
  if (menuBtn && navLinks) {
    menuBtn.onclick = () => navLinks.classList.toggle("open");
    navLinks.querySelectorAll("a").forEach(a => a.onclick = () => navLinks.classList.remove("open"));
  }
  let language = localStorage.getItem("academy-language") || "en";
  function setLanguage(l) {
    language = l;
    document.documentElement.lang = l === "om" ? "om" : "en";
    document.querySelectorAll("[data-en]").forEach(e => e.textContent = e.dataset[l] || e.dataset.en);
    if (langBtn) langBtn.textContent = l === "en" ? "OM" : "EN";
    localStorage.setItem("academy-language", l);
  }
  setLanguage(language);
  if (langBtn) langBtn.onclick = () => setLanguage(language === "en" ? "om" : "en");
  if ($("year")) $("year").textContent = new Date().getFullYear();

  const form = $("registerForm");
  if (form) form.addEventListener("submit", async e => {
    e.preventDefault();
    const note = $("formNote"), button = form.querySelector("button[type=submit]");
    if (!API) { note.textContent = "Registration service is not configured."; return; }
    const payload = {
      fullName: $("name").value.trim(),
      phone: $("phone").value.trim(),
      email: $("email").value.trim(),
      course: $("course").value,
      message: $("message").value.trim()
    };
    button.disabled = true; note.textContent = "Sending registration…";
    try {
      const r = await fetch(`${API}/api/students`, {
        method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(payload)
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || d.message || "Registration failed.");
      note.textContent = "Registration received successfully. Thank you!";
      form.reset();
    } catch (err) {
      note.textContent = `${err.message} If this continues, contact the academy administrator.`;
    } finally { button.disabled = false; }
  });
})();