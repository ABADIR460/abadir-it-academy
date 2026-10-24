const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "30kb" }));
const allowedOrigins = (process.env.FRONTEND_ORIGIN || "").split(",").map(x => x.trim()).filter(Boolean);
app.use(cors({
  origin(origin, cb) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error("Origin is not allowed by CORS"));
  }
}));

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_TOKEN_SECRET } = process.env;
let supabase;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
const required = ["ADMIN_USERNAME", "ADMIN_PASSWORD", "ADMIN_TOKEN_SECRET"];
function configError() {
  if (!supabase) return "Supabase environment variables are not configured in Render.";
  if (required.some(k => !process.env[k])) return "Admin environment variables are not configured in Render.";
  if (ADMIN_TOKEN_SECRET.length < 32) return "ADMIN_TOKEN_SECRET must be at least 32 characters.";
  return null;
}
const b64 = x => Buffer.from(x).toString("base64url");
function safeEqual(a, b) {
  const aa = Buffer.from(String(a || "")), bb = Buffer.from(String(b || ""));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}
function makeToken() {
  const payload = b64(JSON.stringify({ sub: ADMIN_USERNAME, exp: Date.now() + 8 * 60 * 60 * 1000 }));
  const sig = crypto.createHmac("sha256", ADMIN_TOKEN_SECRET).update(payload).digest("base64url");
  return payload + "." + sig;
}
function auth(req, res, next) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const parts = token.split(".");
  if (parts.length !== 2) return res.status(401).json({ error: "Please log in again." });
  const expected = crypto.createHmac("sha256", ADMIN_TOKEN_SECRET || "missing").update(parts[0]).digest("base64url");
  if (!safeEqual(parts[1], expected)) return res.status(401).json({ error: "Invalid admin token." });
  try {
    const p = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    if (p.sub !== ADMIN_USERNAME || !p.exp || p.exp < Date.now()) return res.status(401).json({ error: "Admin session expired. Please log in again." });
    req.admin = p.sub; next();
  } catch { return res.status(401).json({ error: "Invalid admin token." }); }
}
function ready(req, res, next) {
  const e = configError();
  if (e) return res.status(503).json({ error: e });
  next();
}
app.get("/", (req, res) => res.json({ message: "Abadir IT Academy Backend is running" }));
app.get("/api/health", (req, res) => res.json({ status: "OK", databaseConfigured: Boolean(supabase) }));
app.post("/api/admin/login", ready, (req, res) => {
  const { username, password } = req.body || {};
  if (!safeEqual(username, ADMIN_USERNAME) || !safeEqual(password, ADMIN_PASSWORD)) {
    return res.status(401).json({ error: "Incorrect username or password." });
  }
  res.json({ token: makeToken(), expiresIn: 28800 });
});
app.post("/api/students", ready, async (req, res) => {
  const { fullName, phone, email = "", course, message = "" } = req.body || {};
  if (![fullName, phone, course].every(v => typeof v === "string" && v.trim())) {
    return res.status(400).json({ error: "Full name, phone and course are required." });
  }
  const row = { full_name: fullName.trim(), phone: phone.trim(), email: String(email).trim(), course: course.trim(), message: String(message).trim() };
  const { data, error } = await supabase.from("students").insert(row).select("id,full_name,phone,email,course,message,created_at").single();
  if (error) return res.status(500).json({ error: "Could not save registration. Check the students table in Supabase." });
  res.status(201).json({ message: "Registration received", student: data });
});
app.get("/api/students", ready, auth, async (req, res) => {
  const { data, error } = await supabase.from("students").select("id,full_name,phone,email,course,message,created_at").order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: "Could not load students. Check the Supabase students table." });
  res.json(data);
});
app.put("/api/students/:id", ready, auth, async (req, res) => {
  const { fullName, phone, email = "", course } = req.body || {};
  if (![fullName, phone, course].every(v => typeof v === "string" && v.trim())) return res.status(400).json({ error: "Full name, phone and course are required." });
  const { data, error } = await supabase.from("students").update({ full_name: fullName.trim(), phone: phone.trim(), email: String(email).trim(), course: course.trim() }).eq("id", req.params.id).select("id,full_name,phone,email,course,message,created_at").single();
  if (error) return res.status(500).json({ error: "Could not update student. Verify the student ID and table schema." });
  res.json(data);
});
app.delete("/api/students/:id", ready, auth, async (req, res) => {
  const { error } = await supabase.from("students").delete().eq("id", req.params.id);
  if (error) return res.status(500).json({ error: "Could not delete student." });
  res.json({ message: "Student deleted" });
});
app.use((err, req, res, next) => {
  console.error("Request error:", err.message);
  res.status(500).json({ error: "Server error. Check Render logs." });
});
const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`Abadir IT Academy API listening on ${port}`));