import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.resolve(__dirname, "../data/appointments.json");

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
