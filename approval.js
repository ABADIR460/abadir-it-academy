
const APPROVAL_API =
  "https://abadir-it-academy-backend.onrender.com";

async function approveCourse() {
  const studentId =
    document.getElementById("approvalStudentId").value.trim();

  const courseName =
    document.getElementById("approvalCourseName").value.trim();

  const message =
    document.getElementById("approvalMessage");

  const token = localStorage.getItem("adminToken");

  if (!studentId || !courseName) {
    message.textContent = "Enter Student ID and Course Name.";
    return;
  }

  if (!token) {
    message.textContent = "Admin login required.";
    return;
  }

  message.textContent = "Approving course...";

  try {
    const response = await fetch(
      APPROVAL_API + "/api/admin/course-completions/approve",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },
        body: JSON.stringify({
          student_id: Number(studentId),
          course_name: courseName
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Approval failed");
    }

    message.textContent = "Course approved successfully!";

  } catch (error) {
    message.textContent = "Error: " + error.message;
  }
}
