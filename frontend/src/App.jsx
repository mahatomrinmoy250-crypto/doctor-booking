import { useEffect, useMemo, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function App() {
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [form, setForm] = useState({
    patientName: "",
    phone: "",
    email: "",
    doctorId: "",
    date: "",
    message: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState("");

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

  const nextAvailableDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }, []);

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

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to book appointment");
      }

      await res.json();
      setResult("Appointment booked successfully. Our team will call you shortly.");
      setForm({
        patientName: "",
        phone: "",
        email: "",
        doctorId: "",
        date: "",
        message: ""
      });
    } catch (err) {
      setResult(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <header className="hero">
        <div className="hero-content">
          <p className="eyebrow">Trusted Care Since 2011</p>
          <h1>CarePoint Multispecialty Clinic</h1>
          <p className="hero-text">
            Book appointments online with experienced specialists in cardiology,
            pediatrics, dermatology, and preventive medicine.
          </p>
          <a href="#book" className="cta">Book Consultation</a>
        </div>
      </header>

      <main>
        <section className="panel doctors" id="doctors">
          <h2>Meet Our Doctors</h2>
          {loadingDoctors ? <p>Loading doctors...</p> : null}
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

        <section className="panel" id="book">
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
      </main>
    </div>
  );
}
