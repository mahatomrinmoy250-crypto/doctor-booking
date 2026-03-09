import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const emptyForm = {
  patientName: "",
  phone: "",
  email: "",
  doctorId: "",
  date: "",
  message: ""
};

export default function App() {
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState("");
  const [lookupPhone, setLookupPhone] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState("");
  const [patientAppointments, setPatientAppointments] = useState([]);
  const [adminKey, setAdminKey] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminResult, setAdminResult] = useState("");
  const [adminAppointments, setAdminAppointments] = useState([]);

  useEffect(() => {
    async function loadDoctors() {
      try {
        const res = await fetch(`${API_URL}/api/doctors`);
        const data = await res.json();
        setDoctors(Array.isArray(data) ? data : []);
      } catch {
        setDoctors([]);
      } finally {
        setLoadingDoctors(false);
      }
    }

    loadDoctors();
  }, []);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextAvailableDate = tomorrow.toISOString().split("T")[0];

  async function handleSubmit(e) {
    e.preventDefault();
    setResult("");
    setSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/api/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to book appointment");
      }

      setResult("Appointment booked successfully. Our team will call you shortly.");
      setLookupPhone(form.phone);
      setForm(emptyForm);
    } catch (err) {
      setResult(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePatientLookup(e) {
    e.preventDefault();
    setLookupLoading(true);
    setLookupResult("");
    setPatientAppointments([]);

    try {
      const res = await fetch(`${API_URL}/api/appointments?phone=${encodeURIComponent(lookupPhone)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Could not load appointments");
      }

      setPatientAppointments(Array.isArray(data) ? data : []);
      setLookupResult(data.length ? "Appointments found." : "No appointments found for this phone number.");
    } catch (err) {
      setLookupResult(err.message || "Could not load appointments");
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleAdminLoad(e) {
    e.preventDefault();
    setAdminLoading(true);
    setAdminResult("");
    setAdminAppointments([]);

    try {
      const res = await fetch(`${API_URL}/api/admin/appointments`, {
        headers: {
          "x-admin-key": adminKey
        }
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Could not load admin dashboard");
      }

      const sorted = [...data].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setAdminAppointments(sorted);
      setAdminResult(`Loaded ${sorted.length} appointment${sorted.length === 1 ? "" : "s"}.`);
    } catch (err) {
      setAdminResult(err.message || "Could not load admin dashboard");
    } finally {
      setAdminLoading(false);
    }
  }

  return (
    <div className="page">
      <header className="hero">
        <div className="hero-content">
          <div className="hero-copy">
            <p className="eyebrow">Trusted Care Since 2011</p>
            <h1>CarePoint Multispecialty Clinic</h1>
            <p className="hero-text">
              Book consultations, check your appointment status, and manage clinic bookings
              from one modern dashboard.
            </p>
            <div className="hero-actions">
              <a href="#book" className="cta">Book Consultation</a>
              <a href="#admin" className="ghost-cta">Open Admin Panel</a>
            </div>
          </div>
          <div className="hero-badge">
            <strong>24/7 Request Intake</strong>
            <span>Cardiology, Pediatrics, Dermatology</span>
          </div>
        </div>
      </header>

      <main>
        <section className="panel doctors" id="doctors">
          <div className="section-head">
            <div>
              <p className="section-tag">Specialists</p>
              <h2>Meet Our Doctors</h2>
            </div>
            {loadingDoctors ? <p>Loading doctors...</p> : <p>{doctors.length} specialists available</p>}
          </div>
          <div className="doctor-grid">
            {doctors.map((doctor) => (
              <article key={doctor.id} className="doctor-card">
                <img src={doctor.image} alt={doctor.name} loading="lazy" />
                <div>
                  <h3>{doctor.name}</h3>
                  <p>{doctor.specialty}</p>
                  <small>{doctor.experience} experience | {doctor.availability}</small>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="content-grid">
          <section className="panel" id="book">
            <p className="section-tag">Patients</p>
            <h2>Book an Appointment</h2>
            <form onSubmit={handleSubmit} className="booking-form">
              <input
                required
                placeholder="Patient name"
                value={form.patientName}
                onChange={(e) => setForm({ ...form, patientName: e.target.value })}
              />
              <input
                required
                placeholder="Phone number"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <input
                type="email"
                placeholder="Email (optional)"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <select
                required
                value={form.doctorId}
                onChange={(e) => setForm({ ...form, doctorId: e.target.value })}
              >
                <option value="">Select doctor</option>
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>{doc.name} - {doc.specialty}</option>
                ))}
              </select>
              <input
                required
                type="date"
                min={nextAvailableDate}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
              <textarea
                rows="4"
                placeholder="Describe your concern"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
              <button type="submit" disabled={submitting}>
                {submitting ? "Booking..." : "Confirm Appointment"}
              </button>
            </form>
            {result ? <p className="result">{result}</p> : null}
          </section>

          <section className="panel">
            <p className="section-tag">Self Service</p>
            <h2>Check My Booking</h2>
            <form onSubmit={handlePatientLookup} className="booking-form">
              <input
                required
                placeholder="Enter phone number"
                value={lookupPhone}
                onChange={(e) => setLookupPhone(e.target.value)}
              />
              <button type="submit" disabled={lookupLoading}>
                {lookupLoading ? "Checking..." : "Find Appointments"}
              </button>
            </form>
            {lookupResult ? <p className="result">{lookupResult}</p> : null}
            <div className="appointment-list">
              {patientAppointments.map((item) => (
                <article key={item.id} className="appointment-card">
                  <strong>{item.doctorName}</strong>
                  <span>{item.date}</span>
                  <span>{item.patientName}</span>
                  <small>{item.message || "No notes added"}</small>
                </article>
              ))}
            </div>
          </section>
        </div>

        <section className="panel admin-panel" id="admin">
          <div className="section-head">
            <div>
              <p className="section-tag">Clinic Admin</p>
              <h2>Appointment Dashboard</h2>
            </div>
            <p>Protected by an admin key from backend environment variables.</p>
          </div>
          <form onSubmit={handleAdminLoad} className="admin-form">
            <input
              type="password"
              placeholder="Enter admin key"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
            />
            <button type="submit" disabled={adminLoading}>
              {adminLoading ? "Loading..." : "Load Dashboard"}
            </button>
          </form>
          {adminResult ? <p className="result">{adminResult}</p> : null}
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Date</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Message</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {adminAppointments.map((item) => (
                  <tr key={item.id}>
                    <td>{item.patientName}</td>
                    <td>{item.doctorName}</td>
                    <td>{item.date}</td>
                    <td>{item.phone}</td>
                    <td>{item.email || "-"}</td>
                    <td>{item.message || "-"}</td>
                    <td>{new Date(item.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
