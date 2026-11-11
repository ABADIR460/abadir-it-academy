const STUDENT_API =
  "https://abadir-it-academy-backend.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("studentLogin");
  const message = document.getElementById("loginMessage");

  if (!form || !message) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const phone = form.elements.phone.value.trim();
    const password = form.elements.password.value;

    message.textContent = "Logging in...";

    try {
      const response = await fetch(
        STUDENT_API + "/api/student/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ phone, password })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Login failed");
      }

      localStorage.setItem("studentToken", result.token);
      localStorage.setItem(
        "studentInfo",
        JSON.stringify(result.student)
      );

      message.textContent = "Login successful!";
      window.location.href = "student.html";

    } catch (error) {
      message.textContent = error.message;
    }
  });
});
