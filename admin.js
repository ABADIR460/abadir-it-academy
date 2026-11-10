
const API = "https://abadir-it-academy-backend.onrender.com";
let token = "";
let students = [];

document.getElementById("login").addEventListener("submit", async (e) => {
  e.preventDefault();

  const msg = document.getElementById("msg");

  try {
    const r = await fetch(API + "/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: document.getElementById("username").value,
        password: document.getElementById("password").value
      })
    });

    const j = await r.json();
    if (!r.ok) throw Error(j.message || "Login failed");

    token = j.token;
    document.getElementById("login").hidden = true;
    document.getElementById("panel").hidden = false;

    await load();
  await loadExams();  
  } catch (x) {
    msg.textContent = x.message;
  }
});

async function load() {
  const r = await fetch(API + "/api/students", {
    headers: { Authorization: "Bearer " + token }
  });

  const j = await r.json();

  if (!r.ok) {
    document.getElementById("msg").textContent =
      j.message || "Could not load students";
    return;
  }

  students = j;
  document.getElementById("count").textContent =
    "Total students: " + students.length;

  let search = document.getElementById("searchStudent");

  if (!search) {
    search = document.createElement("input");
    search.id = "searchStudent";
    search.placeholder = "Search by name, phone or course";
    search.style.cssText = "width:100%;padding:12px;margin:15px 0";
    document.getElementById("students").before(search);

    search.addEventListener("input", render);
  }

  render();
}

function render() {
  const q = (document.getElementById("searchStudent")?.value || "")
    .toLowerCase();

  const filtered = students.filter(s =>
    [s.full_name, s.phone, s.course]
      .some(v => String(v || "").toLowerCase().includes(q))
  );

  const t = document.getElementById("students");

  t.innerHTML =
    "<tr><th>Name</th><th>Phone</th><th>Course</th><th>Date</th><th>Actions</th></tr>" +

    filtered.map(s => `
      <tr>
        <td>${safe(s.full_name)}</td>
        <td>${safe(s.phone)}</td>
        <td>${safe(s.course)}</td>
        <td>${s.created_at ? new Date(s.created_at).toLocaleDateString() : ""}</td>
        <td>
          <button type="button" onclick="editStudent('${safe(s.id)}')">Edit</button>
          <button type="button" onclick="deleteStudent('${safe(s.id)}')">Delete</button>
        </td>
      </tr>
    `).join("");
}

async function editStudent(id) {
  const s = students.find(x => String(x.id) === String(id));
  if (!s) return;

  const full_name = prompt("Enter student name:", s.full_name);
  if (full_name === null) return;

  const phone = prompt("Enter phone:", s.phone);
  if (phone === null) return;

  const course = prompt("Enter course:", s.course);
  if (course === null) return;

  try {
    const r = await fetch(API + "/api/students/" + encodeURIComponent(id), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify({ full_name, phone, course })
    });

    const j = await r.json();
    if (!r.ok) throw Error(j.message || "Update failed");

    alert("Student updated successfully!");
    await load();
  } catch (e) {
    alert(e.message);
  }
}

async function deleteStudent(id) {
  if (!confirm("Are you sure you want to delete this student?")) return;

  try {
    const r = await fetch(API + "/api/students/" + encodeURIComponent(id), {
      method: "DELETE",
      headers: { Authorization: "Bearer " + token }
    });

    const j = await r.json();
    if (!r.ok) throw Error(j.message || "Delete failed");

    alert("Student deleted successfully!");
    await load();
  } catch (e) {
    alert(e.message);
  }
}

function safe(v) {
  return String(v ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

document.getElementById("load").addEventListener("click", load);
// ===== LEARNING MATERIALS SYSTEM =====

const materialType = document.getElementById("materialType");
const fileArea = document.getElementById("fileArea");
const youtubeArea = document.getElementById("youtubeArea");
const materialForm = document.getElementById("materialForm");

materialType.addEventListener("change", () => {
  const isYoutube = materialType.value === "youtube";

  fileArea.hidden = isYoutube;
  youtubeArea.hidden = !isYoutube;
});

materialForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const msg = document.getElementById("materialMsg");
  const title = document.getElementById("materialTitle").value.trim();
  const description =
    document.getElementById("materialDescription").value.trim();
  const type = materialType.value;

  msg.textContent = "Uploading...";

  try {
    let response;

    if (type === "youtube") {
      const youtube_url =
        document.getElementById("youtubeUrl").value.trim();

      response = await fetch(API + "/api/admin/youtube", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token
        },
        body: JSON.stringify({
          title,
          description,
          youtube_url
        })
      });

    } else {
      const file = document.getElementById("materialFile").files[0];

      if (!file) {
        msg.textContent = "Please select a file.";
        return;
      }

      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("material_type", type);
      formData.append("file", file);

      response = await fetch(API + "/api/admin/materials", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token
        },
        body: formData
      });
    }

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Upload failed");
    }

    msg.textContent = "Material uploaded successfully!";
    materialForm.reset();

    fileArea.hidden = false;
    youtubeArea.hidden = true;

    await loadMaterials();

  } catch (error) {
    msg.textContent = error.message;
  }
})
// LOAD MATERIALS
async function loadMaterials() {
  const container = document.getElementById("materialsList");

  try {
    const response = await fetch(API + "/api/materials");
    const data = await response.json();

    if (!response.ok) throw new Error("Could not load materials");

    if (!data.length) {
      container.textContent = "No materials uploaded yet.";
      return;
    }

    container.innerHTML = data.map(item => {
      const title = safe(item.title);
      const description = safe(item.description || "");

      let link = "";

      if (item.material_type === "youtube") {
        link = `<a href="${safe(item.youtube_url)}" target="_blank" rel="noopener">Watch on YouTube</a>`;
      } else {
        link = `<a href="${safe(item.file_url)}" target="_blank" rel="noopener">Open ${safe(item.material_type).toUpperCase()}</a>`;
      }

      return `
        <div style="padding:12px;border:1px solid #ddd;margin:10px 0">
          <h3>${title}</h3>
          <p>${description}</p>
          ${link}
          <br><br>
          <button onclick="editMaterial('${item.id}')">Edit</button>
          <button onclick="deleteMaterial('${item.id}')">Delete</button>
        </div>
      `;
    }).join("");

  } catch (error) {
    container.textContent = error.message;
  }
}


// EDIT MATERIAL
async function editMaterial(id) {
  const title = prompt("Enter new material title:");
  if (title === null || !title.trim()) return;

  const description = prompt("Enter new description:") || "";

  try {
    const response = await fetch(API + "/api/admin/materials/" + encodeURIComponent(id), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify({ title, description })
    });

    const result = await response.json();

    if (!response.ok) throw new Error(result.message);

    alert("Material updated successfully!");
    await loadMaterials();

  } catch (error) {
    alert(error.message);
  }
}


// DELETE MATERIAL
async function deleteMaterial(id) {
  if (!confirm("Are you sure you want to delete this material?")) return;

  try {
    const response = await fetch(API + "/api/admin/materials/" + encodeURIComponent(id), {
      method: "DELETE",
      headers: {
        Authorization: "Bearer " + token
      }
    });

    const result = await response.json();

    if (!response.ok) throw new Error(result.message);

    alert("Material deleted successfully!");
    await loadMaterials();

  } catch (error) {
    alert(error.message);
  }
}
// ================= ONLINE EXAM MANAGEMENT =================

const examForm = document.getElementById("examForm");
const examSelect = document.getElementById("examSelect");
const examMsg = document.getElementById("examMsg");
const questionForm = document.getElementById("questionForm");
const questionMsg = document.getElementById("questionMsg");
const publishExamBtn = document.getElementById("publishExam");

// Load exams
async function loadExams() {
  try {
    const response = await fetch(API + "/api/admin/exams", {
      headers: {
        Authorization: "Bearer " + token
      }
    });

    const exams = await response.json();
    if (!response.ok) throw new Error(exams.message);

    examSelect.innerHTML = '<option value="">Select Exam</option>';

    exams.forEach(exam => {
      const option = document.createElement("option");
      option.value = exam.id;
      option.textContent = exam.title +
        (exam.is_published ? " (Published)" : " (Draft)");
      examSelect.appendChild(option);
    });

  } catch (error) {
    examMsg.textContent = error.message;
  }
}

// Create exam
if (examForm) {
  examForm.addEventListener("submit", async function(e) {
    e.preventDefault();

    try {
      const response = await fetch(API + "/api/admin/exams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token
        },
        body: JSON.stringify({
          title: document.getElementById("examTitle").value,
          description: document.getElementById("examDescription").value,
          duration_minutes: Number(
            document.getElementById("examDuration").value
          )
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message);

      examMsg.textContent = "Exam created successfully!";
      examForm.reset();
      await loadExams();

    } catch (error) {
      examMsg.textContent = error.message;
    }
  });
}

// Add question
if (questionForm) {
  questionForm.addEventListener("submit", async function(e) {
    e.preventDefault();

    const examId = examSelect.value;
    if (!examId) {
      questionMsg.textContent = "Please select an exam.";
      return;
    }

    try {
      const response = await fetch(
        API + "/api/admin/exams/" + encodeURIComponent(examId) + "/questions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token
          },
          body: JSON.stringify({
            question: document.getElementById("examQuestion").value,
            options: {
              A: document.getElementById("optionA").value,
              B: document.getElementById("optionB").value,
              C: document.getElementById("optionC").value,
              D: document.getElementById("optionD").value
            },
            correct_answer: document.getElementById("correctAnswer").value
          })
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.message);

      questionMsg.textContent = "Question added successfully!";
      questionForm.reset();

    } catch (error) {
      questionMsg.textContent = error.message;
    }
  });
}

// Publish exam
if (publishExamBtn) {
  publishExamBtn.addEventListener("click", async function() {
    const examId = examSelect.value;

    if (!examId) {
      examMsg.textContent = "Please select an exam.";
      return;
    }

    if (!confirm("Publish this exam for students?")) return;

    try {
      const response = await fetch(
        API + "/api/admin/exams/" + encodeURIComponent(examId) + "/publish",
        {
          method: "PATCH",
          headers: {
            Authorization: "Bearer " + token
          }
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.message);

      examMsg.textContent = "Exam published successfully!";
      await loadExams();

    } catch (error) {
      examMsg.textContent = error.message;
    }
  });
}
async function loadExamResults() {
  const list = document.getElementById("examResultsList");

  list.innerHTML = "Loading results...";

  try {
    const response = await fetch(
      "https://abadir-it-academy-backend.onrender.com/api/admin/exam-attempts",
      {
        headers: {
          "Authorization": "Bearer " +
            localStorage.getItem("adminToken")
        }
      }
    );

    if (!response.ok) {
      throw new Error("Could not load results");
    }

    const results = await response.json();

    if (!results.length) {
      list.innerHTML = "No exam results yet.";
      return;
    }

    list.innerHTML = results.map(result => `
      <div class="card">
        <h3>${escapeResult(result.student_name)}</h3>
        <p>Score: ${result.score} / ${result.total_questions}</p>
        <p>Submitted: ${
          new Date(result.submitted_at).toLocaleString()
        }</p>
      </div>
    `).join("");

  } catch (error) {
    list.innerHTML = "Error: " + error.message;
  }
}

function escapeResult(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}
