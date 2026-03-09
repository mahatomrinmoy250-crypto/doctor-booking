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
    name: "Dr. Priya Nair",
    specialty: "Cardiology",
    experience: "12 years",
    availability: "Mon-Sat",
    image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: 2,
    name: "Dr. Arjun Mehta",
    specialty: "Pediatrics",
    experience: "9 years",
    availability: "Mon-Fri",
    image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: 3,
    name: "Dr. Sana Qureshi",
    specialty: "Dermatology",
    experience: "11 years",
    availability: "Tue-Sun",
    image: "https://images.unsplash.com/photo-1651008376811-b90baee60c1f?auto=format&fit=crop&w=900&q=80"
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
