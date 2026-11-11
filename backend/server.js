const express=require("express");
const cors=require("cors");
const bcrypt=require("bcryptjs");
const jwt=require("jsonwebtoken");
const crypto = require("crypto");
const path = require("path");
const {createClient}=require("@supabase/supabase-js");
const multer = require("multer");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "video/mp4",
      "video/webm"
    ];

    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, MP4 and WebM files are allowed"));
    }
  }
});
const app=express();app.use(cors({origin:"*"}));app.use(express.json());
const PORT=process.env.PORT||3000;
const supabaseUrl=process.env.SUPABASE_URL;
const supabaseKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
const JWT_SECRET=process.env.JWT_SECRET;
const ADMIN_USERNAME=process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD_HASH=process.env.ADMIN_PASSWORD_HASH;
const db=supabaseUrl&&supabaseKey?createClient(supabaseUrl,supabaseKey):null;
app.get("/",(req,res)=>res.json({message:"Abadir IT Academy backend is running"}));
app.get("/api/health",(req,res)=>res.json({status:"OK",database:db?"configured":"missing environment variables"}));

app.post("/api/students", async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({
        message: "Database is not configured"
      });
    }

    const {
      fullName,
      phone,
      email,
      gender,
      course,
      educationLevel,
      telegram,
      password
    } = req.body;

    if (!fullName || !phone || !course || !password) {
      return res.status(400).json({
        message: "Name, phone, course and password are required"
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters"
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const { data, error } = await db
      .from("students")
      .insert([{
        full_name: fullName,
        phone,
        email: email || null,
        gender: gender || null,
        course,
        education_level: educationLevel || null,
        telegram: telegram || null,
        password_hash: passwordHash
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: "Registration successful",
      student: {
  id: data.id,
  full_name: data.full_name,
  phone: data.phone,
  course: data.course
}
    });

  } catch (e) {
    console.error("Student registration error:", e);
    res.status(500).json({
      message: "Could not save registration"
    });
  }
});

app.post("/api/student/login", async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({
        message: "Database is not configured"
      });
    }

    if (!JWT_SECRET) {
      return res.status(503).json({
        message: "Login configuration missing"
      });
    }

    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        message: "Phone and password are required"
      });
    }

    const { data, error } = await db
      .from("students")
      .select("id, full_name, phone, course, password_hash")
      .eq("phone", phone.trim());

    if (error) throw error;

    const matches = [];

    for (const student of (data || [])) {
      if (
        student.password_hash &&
        await bcrypt.compare(password, student.password_hash)
      ) {
        matches.push(student);
      }
    }

    if (matches.length === 0) {
      return res.status(401).json({
        message: "Incorrect phone or password"
      });
    }

    if (matches.length > 1) {
      return res.status(409).json({
        message: "Multiple accounts found. Contact the academy admin."
      });
    }

    const student = matches[0];

    const token = jwt.sign(
      {
        role: "student",
        studentId: student.id
      },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      token,
      student: {
        id: student.id,
        full_name: student.full_name,
        phone: student.phone,
        course: student.course
      }
    });

  } catch (error) {
    console.error("Student login error:", error);

    res.status(500).json({
      message: "Student login failed"
    });
  }
});

function auth(req,res,next){try{const h=req.headers.authorization||"";const token=h.startsWith("Bearer ")?h.slice(7):"";req.admin=jwt.verify(token,JWT_SECRET);next();}catch{return res.status(401).json({message:"Unauthorized"});}}console.log("ADMIN CONFIG CHECK:", {
  JWT_SECRET: !!process.env.JWT_SECRET,
  ADMIN_USERNAME: !!process.env.ADMIN_USERNAME,
  ADMIN_PASSWORD_HASH: !!process.env.ADMIN_PASSWORD_HASH
});
app.post(
  "/api/admin/materials",
  auth,
  upload.single("file"),
  async (req, res) => {
    let filePath = "";

    try {
      if (!db) {
        return res.status(503).json({
          message: "Database is not configured"
        });
      }

      if (!req.file) {
        return res.status(400).json({
          message: "Please select a file"
        });
      }

      const { title, description, material_type } = req.body;

      if (!title || !["pdf", "video"].includes(material_type)) {
        return res.status(400).json({
          message: "Title and valid material type are required"
        });
      }

      const ext = path.extname(req.file.originalname).toLowerCase();

      filePath = `materials/${crypto.randomUUID()}${ext}`;

      const { error: uploadError } = await db.storage
        .from("academy-materials")
        .upload(filePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = db.storage
        .from("academy-materials")
        .getPublicUrl(filePath);

      const fileUrl = urlData.publicUrl;

      const { data, error } = await db
        .from("learning_materials")
        .insert([{
          title,
          description: description || null,
          material_type,
          file_url: fileUrl
        }])
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({
        message: "Material uploaded successfully",
        material: data
      });

    } catch (e) {
      console.error("Material upload error:", e);

      if (filePath) {
        await db.storage
          .from("academy-materials")
          .remove([filePath]);
      }

      res.status(500).json({
        message: "Could not upload material"
      });
    }
  }
);

app.post("/api/admin/login",async(req,res)=>{try{const {username,password}=req.body;if(!JWT_SECRET||!ADMIN_USERNAME||!ADMIN_PASSWORD_HASH)return res.status(503).json({message:"Admin environment variables are missing"});if(username!==ADMIN_USERNAME||!await bcrypt.compare(password,ADMIN_PASSWORD_HASH))return res.status(401).json({message:"Incorrect username or password"});const token=jwt.sign({role:"admin"},JWT_SECRET,{expiresIn:"8h"});res.json({token});}catch(e){res.status(500).json({message:"Login error"});}});
app.get("/api/students",auth,async(req,res)=>{try{if(!db)return res.status(503).json({message:"Database is not configured"});const {data,error}=await db.from("students").select("*").order("created_at",{ascending:false});if(error)throw error;res.json(data);}catch(e){console.error(e);res.status(500).json({message:"Could not retrieve students"});}});
// UPDATE STUDENT
app.put("/api/students/:id", auth, async (req, res) => {
  try {
    const { full_name, phone, course } = req.body;

    if (!full_name || !phone || !course) {
      return res.status(400).json({
        message: "Name, phone and course are required"
      });
    }

    const { data, error } = await db
      .from("students")
      .update({ full_name, phone, course })
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: "Student updated successfully", student: data });
  } catch (e) {
    res.status(500).json({ message: "Could not update student" });
  }
});

// DELETE STUDENT
app.delete("/api/students/:id", auth, async (req, res) => {
  try {
    const { data, error } = await db
      .from("students")
      .delete()
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: "Student deleted successfully" });
  } catch (e) {
    res.status(500).json({ message: "Could not delete student" });
  }
});
// ADD YOUTUBE VIDEO
app.post("/api/admin/youtube", auth, async (req, res) => {
  try {
    const { title, description, youtube_url } = req.body;

    if (!title || !youtube_url) {
      return res.status(400).json({
        message: "Title and YouTube URL are required"
      });
    }

    const url = new URL(youtube_url);

    const validHost = [
      "youtube.com",
      "www.youtube.com",
      "youtu.be",
      "m.youtube.com"
    ];

    if (url.protocol !== "https:" || !validHost.includes(url.hostname)) {
      return res.status(400).json({
        message: "Invalid YouTube URL"
      });
    }

    const { data, error } = await db
      .from("learning_materials")
      .insert([{
        title,
        description: description || null,
        material_type: "youtube",
        youtube_url
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: "YouTube video added successfully",
      material: data
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({
      message: "Could not add YouTube video"
    });
  }
});

// PUBLIC MATERIALS LIST
app.get("/api/materials", async (req, res) => {
  try {
    const { data, error } = await db
      .from("learning_materials")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (e) {
    res.status(500).json({
      message: "Could not load materials"
    });
  }
});// EDIT LEARNING MATERIAL
app.put("/api/admin/materials/:id", auth, async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({
        message: "Database is not configured"
      });
    }

    const { title, description } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        message: "Material title is required"
      });
    }

    const { data, error } = await db
      .from("learning_materials")
      .update({
        title: title.trim(),
        description: description || null
      })
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      message: "Material updated successfully",
      material: data
    });

  } catch (e) {
    console.error("Edit material error:", e);
    res.status(500).json({
      message: "Could not update material"
    });
  }
});


// DELETE LEARNING MATERIAL
app.delete("/api/admin/materials/:id", auth, async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({
        message: "Database is not configured"
      });
    }

    const { data, error } = await db
      .from("learning_materials")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error) throw error;

    // Remove uploaded file from Supabase Storage
    if (data.file_url) {
      const marker = "/storage/v1/object/public/academy-materials/";
      const position = data.file_url.indexOf(marker);

      if (position !== -1) {
        const filePath = decodeURIComponent(
          data.file_url.substring(position + marker.length)
        );

        const { error: storageError } = await db.storage
          .from("academy-materials")
          .remove([filePath]);

        if (storageError) throw storageError;
      }
    }

    const { error: deleteError } = await db
      .from("learning_materials")
      .delete()
      .eq("id", req.params.id);

    if (deleteError) throw deleteError;

    res.json({
      message: "Material deleted successfully"
    });

  } catch (e) {
    console.error("Delete material error:", e);
    res.status(500).json({
      message: "Could not delete material"
    });
  }
});// ================= ONLINE EXAMS =================

// Admin: Create exam
app.post("/api/admin/exams", auth, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ message: "Database not configured" });
    }

    const { title, description, duration_minutes } = req.body;

    if (!title || !duration_minutes) {
      return res.status(400).json({ message: "Title and duration are required" });
    }

    const { data, error } = await db
      .from("exams")
      .insert([{
        title,
        description,
        duration_minutes,
        is_published: false
      }])
      .select()
      .single();

    if (error) throw error;

    res.json({ message: "Exam created successfully", exam: data });
  } catch (e) {
    console.error("Create exam error:", e);
    res.status(500).json({ message: "Could not create exam" });
  }
});

// Admin: Add question
app.post("/api/admin/exams/:id/questions", auth, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ message: "Database not configured" });
    }

    const { question, options, correct_answer } = req.body;

    if (!question || !options || !correct_answer) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const { data, error } = await db
      .from("exam_questions")
      .insert([{
        exam_id: req.params.id,
        question,
        options,
        correct_answer
      }])
      .select()
      .single();

    if (error) throw error;

    res.json({ message: "Question added successfully", question: data });
  } catch (e) {
    console.error("Add question error:", e);
    res.status(500).json({ message: "Could not add question" });
  }
});

// Public: List published exams
app.get("/api/exams", async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ message: "Database not configured" });
    }

    const { data, error } = await db
      .from("exams")
      .select("id,title,description,duration_minutes,created_at")
      .eq("is_published", true);

    if (error) throw error;

    res.json(data);
  } catch (e) {
    console.error("List exams error:", e);
    res.status(500).json({ message: "Could not load exams" });
  }
});

// Public: Get questions WITHOUT correct answers
app.get("/api/exams/:id/questions", async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ message: "Database not configured" });
    }

    const { data, error } = await db
      .from("exam_questions")
      .select("id,question,options")
      .eq("exam_id", req.params.id);

    if (error) throw error;

    res.json(data);
  } catch (e) {
    console.error("Load exam questions error:", e);
    res.status(500).json({ message: "Could not load questions" });
  }
});

// Public: Submit exam and mark answers on server
app.post("/api/exams/:id/submit", async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ message: "Database not configured" });
    }

    const { student_name, answers } = req.body;

    if (!student_name || !Array.isArray(answers)) {
      return res.status(400).json({ message: "Student name and answers are required" });
    }

    const { data: questions, error: qError } = await db
      .from("exam_questions")
      .select("id,correct_answer")
      .eq("exam_id", req.params.id);

    if (qError) throw qError;
    if (!questions || questions.length === 0) {
      return res.status(404).json({ message: "No questions found" });
    }

    const answerMap = new Map(
      answers.map(a => [String(a.question_id), String(a.answer)])
    );

    const score = questions.reduce((total, q) => {
      return total + (answerMap.get(String(q.id)) === String(q.correct_answer) ? 1 : 0);
    }, 0);

    const { error: saveError } = await db
      .from("exam_attempts")
      .insert([{
        exam_id: req.params.id,
        student_name: student_name.trim(),
        score,
        total_questions: questions.length
      }]);

    if (saveError) throw saveError;

    res.json({
      message: "Exam submitted successfully",
      score,
      total_questions: questions.length
    });
  } catch (e) {
    console.error("Submit exam error:", e);
    res.status(500).json({ message: "Could not submit exam" });
  }
});// Admin: Publish exam
app.patch("/api/admin/exams/:id/publish", auth, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ message: "Database not configured" });
    }

    const { data, error } = await db
      .from("exams")
      .update({ is_published: true })
      .eq("id", req.params.id)
      .select("id,title,is_published")
      .single();

    if (error) throw error;

    res.json({
      message: "Exam published successfully",
      exam: data
    });
  } catch (e) {
    console.error("Publish exam error:", e);
    res.status(500).json({ message: "Could not publish exam" });
  }
});// ADMIN: LIST ALL EXAMS
app.get("/api/admin/exams", auth, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({
        message: "Database not configured"
      });
    }

    const { data, error } = await db
      .from("exams")
      .select("id,title,description,duration_minutes,is_published,created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (e) {
    console.error("Admin exam list error:", e);
    res.status(500).json({
      message: "Could not load exams"
    });
  }
});
app.get("/", (req, res) => {
  res.send("Abadir IT Academy backend is running");
});
// ADMIN: VIEW EXAM RESULTS
app.get("/api/admin/exam-attempts", auth, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({
        message: "Database not configured"
      });
    }

    const { data, error } = await db
      .from("exam_attempts")
      .select("*")
      .order("submitted_at", { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Load exam results error:", error);
    res.status(500).json({
      message: "Could not load exam results"
    });
  }
});app.get("/api/student/exam-history", async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({
        message: "Database is not configured"
      });
    }

    const studentName = String(req.query.name || "").trim();

    if (!studentName) {
      return res.status(400).json({
        message: "Student name is required"
      });
    }

    const { data, error } = await db
      .from("exam_attempts")
      .select("exam_id, student_name, score, total_questions, submitted_at")
      .ilike("student_name", studentName)
      .order("submitted_at", { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Exam history error:", error);
    res.status(500).json({
      message: "Could not load exam history"
    });
  }
});
app.listen(PORT,()=>console.log("Server running on port "+PORT));
