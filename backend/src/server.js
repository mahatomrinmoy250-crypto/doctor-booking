import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { readAppointments, saveAppointment } from "./dataStore.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

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

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "doctor-backend" });
});

app.get("/api/doctors", (_req, res) => {
  res.json(doctors);
});

app.get("/api/appointments", (req, res) => {
  const all = readAppointments();
  const phone = req.query.phone?.toString().trim();

  if (!phone) {
    return res.json(all);
  }

  return res.json(all.filter((item) => item.phone === phone));
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
