async function requestCertificate() {
  const message = document.getElementById("certificateMessage");
  const course = document.getElementById("certificateCourse").value.trim();
  const token = localStorage.getItem("studentToken");

  if (!course) {
    message.textContent = "Please enter your course name.";
    return;
  }

  if (!token) {
    window.location.href = "login.html";
    return;
  }

  message.textContent = "Checking certificate eligibility...";

  try {
    const response = await fetch(
      EXAM_API + "/api/student/certificates/issue",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },
        body: JSON.stringify({
  course_name: course
 })
      });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Certificate request failed");
    }

    message.textContent =
      "Certificate issued: " + data.certificate.certificate_id;

  } catch (error) {
    message.textContent = "Error: " + error.message;
  }
}
