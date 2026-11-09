const API = "https://abadir-it-academy-backend.onrender.com";
let activeExam = null;
let questions = [];
let timerInterval = null;
let remainingSeconds = 0;
let submitted = false;
let submitting = false;

// LOAD PUBLISHED EXAMS
async function loadExams() {
  const list = document.getElementById("examList");
  const status = document.getElementById("examStatus");

  try {
    const response = await fetch(API + "/api/exams");
    const exams = await response.json();

    if (!response.ok) throw new Error("Could not load exams");

    status.textContent = exams.length
      ? "Available examinations:"
      : "No published exams available yet.";

    exams.forEach(exam => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "btn";
      button.textContent =
        exam.title + " (" + exam.duration_minutes + " minutes)";
      button.style.margin = "8px";

      button.addEventListener("click", () => startExam(exam));

      list.appendChild(button);
    });

  } catch (error) {
    status.textContent = error.message;
  }
}

// START EXAM
async function startExam(exam) {
  const result = document.getElementById("examResult");
  result.textContent = "";

  try {
    const response = await fetch(
      API + "/api/exams/" + encodeURIComponent(exam.id) + "/questions"
    );

    const data = await response.json();

    if (!response.ok) throw new Error("Could not load questions");
    if (!data.length) throw new Error("This exam has no questions yet.");

    activeExam = exam;
    questions = data;
    submitted = false;
    submitting = false;

    document.getElementById("activeExamTitle").textContent = exam.title;
    document.getElementById("examPaper").hidden = false;
    document.getElementById("examList").hidden = true;

    const form = document.getElementById("onlineExamForm");
    const questionArea = document.getElementById("examQuestions");

    form.hidden = true;
    questionArea.innerHTML = "";

    data.forEach((q, index) => {
      const box = document.createElement("div");
      box.className = "section";

      const heading = document.createElement("h4");
      heading.textContent = (index + 1) + ". " + q.question;
      box.appendChild(heading);

      ["A", "B", "C", "D"].forEach(letter => {
        const label = document.createElement("label");
        const radio = document.createElement("input");

        radio.type = "radio";
        radio.name = "question_" + q.id;
        radio.value = letter;

        label.appendChild(radio);
        label.appendChild(
          document.createTextNode(
            " " + letter + ". " + (q.options[letter] || "")
          )
        );

        box.appendChild(label);
        box.appendChild(document.createElement("br"));
      });

      questionArea.appendChild(box);
    });

    // Create Start button
    const oldButton = document.getElementById("startExamButton");
    if (oldButton) oldButton.remove();

    const startButton = document.createElement("button");
    startButton.id = "startExamButton";
    startButton.type = "button";
    startButton.className = "btn";
    startButton.textContent = "Start Exam";

    form.parentNode.insertBefore(startButton, form);

    startButton.addEventListener("click", () => {
      const name = document.getElementById("studentExamName").value.trim();

      if (!name) {
        result.textContent = "Please enter your name first.";
        return;
      }

      result.textContent = "";
      startButton.remove();
      form.hidden = false;

      remainingSeconds = Number(exam.duration_minutes) * 60;
      updateTimer();

      clearInterval(timerInterval);

      timerInterval = setInterval(() => {
        remainingSeconds--;
        updateTimer();

        if (remainingSeconds <= 0) {
          clearInterval(timerInterval);
          submitExam(true);
        }
      }, 1000);
    });

  } catch (error) {
    result.textContent = error.message;
  }
}

// DISPLAY TIMER
function updateTimer() {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  document.getElementById("examTimer").textContent =
    "Time remaining: " +
    minutes + ":" + String(seconds).padStart(2, "0");
}

// SUBMIT EXAM
document.getElementById("onlineExamForm").addEventListener(
  "submit",
  async function(event) {
    event.preventDefault();
    await submitExam(false);
  }
);

async function submitExam(autoSubmit) {
  if (submitted || submitting) return;

  const name = document.getElementById("studentExamName").value.trim();
  const result = document.getElementById("examResult");

  if (!name) {
    result.textContent = "Please enter your name.";
    return;
  }

  submitting = true;

  const answers = questions.map(q => {
    const selected = document.querySelector(
      'input[name="question_' + q.id + '"]:checked'
    );

    return {
      question_id: q.id,
      answer: selected ? selected.value : ""
    };
  });

  try {
    const response = await fetch(
      API + "/api/exams/" + encodeURIComponent(activeExam.id) + "/submit",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          student_name: name,
          answers: answers
        })
      }
    );

    const data = await response.json();

    if (!response.ok) throw new Error(data.message || "Submission failed");

    submitted = true;
    clearInterval(timerInterval);

    document.getElementById("onlineExamForm").hidden = true;

    result.textContent =
      (autoSubmit ? "Time is over! " : "") +
      "Exam submitted successfully. Your score: " +
      data.score + " / " + data.total_questions;

  } catch (error) {
    result.textContent = error.message;
  } finally {
    submitting = false;
  }
}

// TEST SCRIPT
document.getElementById("examStatus").textContent = "JavaScript is working!";
loadExams();
