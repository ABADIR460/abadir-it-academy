
Conversation with Gemini
Admin log in naf hojachu didde naf siressi me

Faayidaan HTML kee (Admin Dashboard) kun sirriitti hojjechuuf, JavaScript (faayilii admin.js) fi backend ykn logic barbaachisa. Ammaan tana fakkii HTML tarrifametti gargaaramuun, yoo admin.js hin jirre ykn koodiin isaa dogoggora qabaate loginni kee si hin dandeessisu.

Koodii admin.js guutuu fi sirrii ta'e armaan gadii fayyadami. Kunis login kee hordofeefii gadi dhiisuu (dashboard banuu) danda'a.

1. Faayilii admin.js (Koodii kana itti dabali):
JavaScript
document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const loginDiv = document.getElementById("login");
    const dashDiv = document.getElementById("dash");
    const loginMsg = document.getElementById("loginMsg");
    const logoutBtn = document.getElementById("logout");

    // Fakkeenyaaf maqaa fayyadamaa (Username) fi Jecha Darbiif (Password)
    const ADMIN_USER = "admin";
    const ADMIN_PASS = "password123";

    // Yeroo duraatiif dashboard dhoksi (HTML irratti hidhamee jiraachuutu danda'a)
    // Garuu yoo CSS irratti hidden ta'e kunis ni tajaajila
    if (localStorage.getItem("isLoggedIn") === "true") {
        showDashboard();
    }

    loginForm.addEventListener("submit", (e) => {
        e.preventDefault(); // Page-refresh akka hin taane godha

        const userInput = document.getElementById("user").value;
        const passInput = document.getElementById("pass").value;

        if (userInput === ADMIN_USER && passInput === ADMIN_PASS) {
            localStorage.setItem("isLoggedIn", "true");
            showDashboard();
            loginMsg.textContent = "";
        } else {
            loginMsg.style.color = "red";
            loginMsg.textContent = "Maqaa fayyadamaa ykn jecha darbiilee dogoggora. Irra deebi'aa yaali!";
        }
    });

    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("isLoggedIn");
        dashDiv.classList.add("hidden");
        loginDiv.classList.remove("hidden");
        loginForm.reset();
    });

    function showDashboard() {
        loginDiv.classList.add("hidden");
        dashDiv.classList.remove("hidden");
        // Asitti odeeffannoo ykn galmee barattootaa fiduu dandeessa
    }
});
