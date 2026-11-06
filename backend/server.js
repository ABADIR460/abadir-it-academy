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
app.post("/api/students",async(req,res)=>{try{if(!db)return res.status(503).json({message:"Database is not configured"});const {fullName,phone,email,gender,course,educationLevel,telegram}=req.body;if(!fullName||!phone||!course)return res.status(400).json({message:"Full name, phone and course are required"});const {data,error}=await db.from("students").insert([{full_name:fullName,phone,email:email||null,gender:gender||null,course,education_level:educationLevel||null,telegram:telegram||null}]).select().single();if(error)throw error;res.status(201).json({message:"Registration successful",student:data});}catch(e){console.error(e);res.status(500).json({message:"Could not save registration"});}});
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
});

app.listen(PORT,()=>console.log("Server running on port "+PORT));
