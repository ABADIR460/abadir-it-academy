
const REGISTER_API =
  "https://abadir-it-academy-backend.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registration");
  const message = document.getElementById("regMessage");

  if (!form || !message) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);

    const student = {
      fullName: formData.get("fullName").trim(),
      phone: formData.get("phone").trim(),
      email: formData.get("email").trim(),
      gender: formData.get("gender"),
      course: formData.get("course"),
      educationLevel: formData.get("educationLevel").trim(),
      telegram: formData.get("telegram").trim(),
      password: formData.get("password")
    };

    message.textContent = "Submitting registration...";

    try {
      const response = await fetch(
        REGISTER_API + "/api/students",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(student)
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Registration failed");
      }

      message.textContent = "Registration successful!";
      form.reset();

    } catch (error) {
      message.textContent = error.message;
    }
  });
});
