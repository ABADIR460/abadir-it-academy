const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const students = [];

app.get("/", (req, res) => {
  res.json({
    message: "Abadir IT Academy Backend is running!"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Backend is connected successfully"
  });
});

app.post("/api/students", (req, res) => {
  const {
    fullName,
    phone,
    email,
    gender,
    course,
    educationLevel,
    telegram
  } = req.body;

  if (!fullName || !phone || !course) {
    return res.status(400).json({
      message: "Full name, phone and course are required."
    });
  }

  const student = {
    id: students.length + 1,
    fullName,
    phone,
    email,
    gender,
    course,
    educationLevel,
    telegram,
    createdAt: new Date().toISOString()
  };

  students.push(student);

  res.status(201).json({
    message: "Student registered successfully!",
    student
  });
});

app.get("/api/students", (req, res) => {
  res.json(students);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Abadir IT Academy Backend running on port ${PORT}`);
});
