
JavaScript

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

  // Open print window immediately to avoid popup blocking
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    message.textContent = "Please allow pop-ups to create your certificate.";
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
        body: JSON.stringify({ course_name: course })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Certificate request failed");
    }

    const cert = data.certificate;
    const student = JSON.parse(
      localStorage.getItem("studentInfo") || "{}"
    );

    const escapeHTML = (value) =>
      String(value || "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[char]);

    const studentName = escapeHTML(student.full_name || "Student");
    const courseName = escapeHTML(cert.course_name);
    const certificateId = escapeHTML(cert.certificate_id);
    const score = Number(cert.score).toFixed(1);
    const issueDate = cert.issued_at
      ? new Date(cert.issued_at).toLocaleDateString()
      : new Date().toLocaleDateString();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Abadir IT Academy Certificate</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            font-family: Georgia, serif;
            text-align: center;
            padding: 25px;
            background: #f1f5f9;
          }
          .certificate {
            background: white;
            border: 12px double #174ea6;
            padding: 45px 20px;
            max-width: 900px;
            margin: 20px auto;
          }
          h1 { color: #174ea6; font-size: 36px; }
          h2 { font-size: 30px; margin: 25px; }
          .name { font-size: 32px; color: #174ea6; }
          .course { font-size: 23px; font-weight: bold; }
          .details { margin-top: 35px; line-height: 1.8; }
          button {
            padding: 13px 25px;
            background: #174ea6;
            color: white;
            border: 0;
            border-radius: 6px;
            font-size: 16px;
            margin: 20px;
          }
          @media print {
            body { background: white; padding: 0; }
            .certificate { margin: 0; min-height: 80vh; }
            button { display: none; }
            @page { size: landscape; margin: 10mm; }
          }
        </style>
      </head>
      <body>
        <div class="certificate">
          <h1>ABADIR IT ACADEMY</h1>
          <h2>CERTIFICATE OF COMPLETION</h2>
          <p>This certificate is proudly presented to</p>
          <h2 class="name">${studentName}</h2>
          <p>For successfully completing the course</p>
          <p class="course">${courseName}</p>
          <div class="details">
            <p>Examination Score: ${score}%</p>
            <p>Certificate ID: ${certificateId}</p>
            <p>Date Issued: ${escapeHTML(issueDate)}</p>
          </div>
          <h3>Director | Abadir IT Academy</h3>
        </div>
        <button onclick="window.print()">Print / Save as PDF</button>
      </body>
      </html>
    `);

    printWindow.document.close();

    message.textContent =
      "Certificate issued successfully: " + cert.certificate_id;

  } catch (error) {
    printWindow.close();
    message.textContent = "Error: " + error.message;
  }
}
