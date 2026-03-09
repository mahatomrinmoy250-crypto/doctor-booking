import fs from "node:fs";
import path from "node:path";

const DATA_PATH = path.resolve("backend/data/appointments.json");

export function readAppointments() {
  try {
    const raw = fs.readFileSync(DATA_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAppointment(appointment) {
  const all = readAppointments();
  all.push(appointment);
  fs.writeFileSync(DATA_PATH, JSON.stringify(all, null, 2));
  return appointment;
}
