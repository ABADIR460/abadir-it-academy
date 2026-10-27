document.addEventListener("DOMContentLoaded", () => {
  const languageToggle = document.getElementById("languageToggle");
  const menuToggle = document.getElementById("menuToggle");
  const navLinks = document.getElementById("navLinks");
  const year = document.getElementById("year");
  let language = "en";

  if (year) year.textContent = new Date().getFullYear();

  if (languageToggle) {
    languageToggle.addEventListener("click", () => {
      language = language === "en" ? "or" : "en";
      document.documentElement.lang = language === "en" ? "en" : "om";
      document.querySelectorAll("[data-en][data-or]").forEach((element) => {
        element.textContent = element.dataset[language];
      });
      languageToggle.textContent = language === "en" ? "Afaan Oromoo" : "English";
    });
  }

  if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {
      const isOpen = navLinks.classList.toggle("open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
      menuToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
    });
    navLinks.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => navLinks.classList.remove("open"));
    });
  }
});