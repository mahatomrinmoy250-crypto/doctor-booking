import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import crypto from "node:crypto";
import { readAppointments, saveAppointment } from "./dataStore.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || "change-this-session-secret";
const TOKEN_EXPIRY_MS = 1000 * 60 * 60 * 12;

const doctors = [
  {
    id: 1,
    name: "Dr. Nitin Dhira",
    department: "Ophthalmology",
    specialty: "Eye Specialist",
    title: "Director and Eye Specialist",
    qualifications: "Director, Sarada Netralaya & Maternity",
    experience: "Cataract, squint, and comprehensive eye care",
    availability: "Mon-Sat and Sunday morning clinic",
    summary:
      "Presented by the clinic as the eye specialist and director, with visible emphasis on cataract care, squint treatment, and complete eye-health guidance.",
    specialties: [
      "Cataract care",
      "Squint treatment",
      "Comprehensive eye checkups"
    ],
    image: "https://images.unsplash.com/photo-1614436163996-25cee5f54290?auto=format&fit=crop&w=1200&q=80"
  },
  {
    id: 2,
    name: "Dr. Shabnam Kumari Dhira",
    department: "Maternity & Gynecology",
    specialty: "Obstetrics and Gynecology",
    title: "Consultant Gynecologist",
    qualifications: "MBBS, MD (Obstetrics & Gynecology)",
    experience: "Pregnancy, delivery, and advanced women's health care",
    availability: "Mon-Sat and Sunday morning clinic",
    summary:
      "Known through patient reviews for supportive pregnancy care, strong communication, and comprehensive women's health treatment including advanced laparoscopic counseling.",
    specialties: [
      "Pregnancy care",
      "Delivery planning",
      "Laparoscopic gynecology"
    ],
    image: "https://images.unsplash.com/photo-1594824475317-d7f0617f0cf7?auto=format&fit=crop&w=1200&q=80"
  }
];

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

function createSignature(value) {
  return crypto
    .createHmac("sha256", ADMIN_SESSION_SECRET)
    .update(value)
    .digest("hex");
}

function createAdminToken() {
  const payload = {
    role: "admin",
    exp: Date.now() + TOKEN_EXPIRY_MS
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createSignature(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function verifyAdminToken(token) {
  if (!token) {
    return false;
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return false;
  }

  const expectedSignature = createSignature(encodedPayload);
  if (signature.length !== expectedSignature.length) {
    return false;
  }

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    return payload.role === "admin" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

function getBearerToken(req) {
  const authHeader = req.headers.authorization?.toString() || "";
  if (!authHeader.startsWith("Bearer ")) {
    return "";
  }

  return authHeader.slice("Bearer ".length).trim();
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "doctor-backend" });
});

app.get("/api/doctors", (_req, res) => {
  res.json(doctors);
});

app.get("/api/appointments", (req, res) => {
  const phone = req.query.phone?.toString().trim();

  if (!phone) {
    return res.status(400).json({ error: "phone query is required" });
  }

  const all = readAppointments();
  return res.json(all.filter((item) => item.phone === phone));
});

app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;

  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    return res.status(500).json({ error: "Admin login is not configured" });
  }

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  return res.json({
    token: createAdminToken(),
    adminName: ADMIN_USERNAME
  });
});

app.get("/api/admin/appointments", (req, res) => {
  const token = getBearerToken(req);
  if (!verifyAdminToken(token)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const all = readAppointments();
  return res.json(all);
});

app.post("/api/appointments", (req, res) => {
  const { patientName, phone, email, doctorId, date, message } = req.body;

  if (!patientName || !phone || !doctorId || !date) {
    return res.status(400).json({
      error: "patientName, phone, doctorId, and date are required"
    });
  }

  const doctor = doctors.find((d) => d.id === Number(doctorId));
  if (!doctor) {
    return res.status(404).json({ error: "Doctor not found" });
  }

  const appointment = {
    id: Date.now(),
    patientName: patientName.trim(),
    phone: phone.trim(),
    email: email?.trim() || "",
    doctorId: doctor.id,
    doctorName: doctor.name,
    date,
    message: message?.trim() || "",
    createdAt: new Date().toISOString()
  };

  const saved = saveAppointment(appointment);
  return res.status(201).json(saved);
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
