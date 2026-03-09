import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const ADMIN_TOKEN_KEY = "carepoint_admin_token";
const ADMIN_NAME_KEY = "carepoint_admin_name";

const emptyForm = {
  patientName: "",
  phone: "",
  email: "",
  doctorId: "",
  date: "",
  message: ""
};

const services = [
  {
    title: "Primary and Specialist Care",
    copy: "Fast routing to trusted clinicians with a refined digital intake experience."
  },
  {
    title: "Preventive Health Planning",
    copy: "Screenings, checkups, and continuity programs for long-term wellness."
  },
  {
    title: "Follow-Up Coordination",
    copy: "A calmer path from first visit to next appointment with fewer patient touchpoints."
  }
];

const trustItems = [
  "Specialist-led consultations",
  "Same-site patient booking and lookup",
  "Private owner dashboard for operations"
];

function getCurrentView() {
  return window.location.pathname.toLowerCase() === "/admin" ? "admin" : "home";
}

function navigateTo(path, setView) {
  window.history.pushState({}, "", path);
  setView(getCurrentView());
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export default function App() {
  const [view, setView] = useState(getCurrentView);
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState("");
  const [lookupPhone, setLookupPhone] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState("");
  const [patientAppointments, setPatientAppointments] = useState([]);
  const [adminCredentials, setAdminCredentials] = useState({ username: "", password: "" });
  const [adminToken, setAdminToken] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminResult, setAdminResult] = useState("");
  const [adminAppointments, setAdminAppointments] = useState([]);

  useEffect(() => {
    function onPopState() {
      setView(getCurrentView());
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

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

  useEffect(() => {
    const savedToken = window.localStorage.getItem(ADMIN_TOKEN_KEY) || "";
    const savedName = window.localStorage.getItem(ADMIN_NAME_KEY) || "";

    if (savedToken) {
      setAdminToken(savedToken);
      setAdminName(savedName);
    }
  }, []);

  useEffect(() => {
    if (adminToken) {
      loadAdminAppointments(adminToken);
    }
  }, [adminToken]);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextAvailableDate = tomorrow.toISOString().split("T")[0];
  const todayDate = new Date().toISOString().split("T")[0];
  const todayAppointments = adminAppointments.filter((item) => item.date === todayDate);
  const upcomingAppointments = adminAppointments.filter((item) => item.date >= todayDate);

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

  async function loadAdminAppointments(token) {
    setAdminLoading(true);
    setAdminResult("");

    try {
      const res = await fetch(`${API_URL}/api/admin/appointments`, {
        headers: {
          Authorization: `Bearer ${token}`
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
      handleAdminLogout();
      setAdminResult(err.message || "Could not load admin dashboard");
    } finally {
      setAdminLoading(false);
    }
  }

  async function handleAdminLogin(e) {
    e.preventDefault();
    setAdminLoading(true);
    setAdminResult("");

    try {
      const res = await fetch(`${API_URL}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adminCredentials)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      window.localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      window.localStorage.setItem(ADMIN_NAME_KEY, data.adminName || adminCredentials.username);
      setAdminToken(data.token);
      setAdminName(data.adminName || adminCredentials.username);
      setAdminCredentials({ username: "", password: "" });
    } catch (err) {
      setAdminResult(err.message || "Login failed");
    } finally {
      setAdminLoading(false);
    }
  }

  function handleAdminLogout() {
    window.localStorage.removeItem(ADMIN_TOKEN_KEY);
    window.localStorage.removeItem(ADMIN_NAME_KEY);
    setAdminToken("");
    setAdminName("");
    setAdminAppointments([]);
  }

  function renderPublicSite() {
    return (
      <div className="shell">
        <div className="ambient ambient-one" />
        <div className="ambient ambient-two" />

        <header className="topbar">
          <a href="#home" className="brandmark">
            <span className="brandmark-chip">CP</span>
            <span>
              <strong>CarePoint Clinic</strong>
              <small>Private multispecialty practice</small>
            </span>
          </a>
          <nav className="topnav">
            <a href="#specialists">Specialists</a>
            <a href="#booking">Book</a>
            <a href="#lookup">Track</a>
          </nav>
        </header>

        <main>
          <section className="hero-shell" id="home">
            <div className="hero-intro">
              <p className="eyebrow">CarePoint Clinic</p>
              <h1>Calm, modern care with a booking experience patients can trust.</h1>
              <p className="lead">
                A premium clinic website that feels professional from the first screen:
                clean specialist discovery, direct online booking, and simple appointment lookup.
              </p>
              <div className="hero-actions">
                <a href="#booking" className="button-primary">Book Consultation</a>
                <a href="#specialists" className="button-secondary">View Doctors</a>
              </div>
            </div>

            <div className="hero-side">
              <article className="trust-panel">
                <p className="eyebrow">Why It Works</p>
                <ul className="trust-list">
                  {trustItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
              <article className="micro-stats">
                <div>
                  <strong>15+</strong>
                  <span>years of trust</span>
                </div>
                <div>
                  <strong>12k</strong>
                  <span>consultations</span>
                </div>
                <div>
                  <strong>4.9/5</strong>
                  <span>patient rating</span>
                </div>
              </article>
            </div>
          </section>

          <section className="info-band">
            {services.map((service) => (
              <article key={service.title} className="info-card">
                <h2>{service.title}</h2>
                <p>{service.copy}</p>
              </article>
            ))}
          </section>

          <section className="specialists-panel" id="specialists">
            <div className="section-header">
              <div>
                <p className="eyebrow">Clinical Team</p>
                <h2>Specialists presented with clearer hierarchy and stronger trust.</h2>
              </div>
              <p className="section-meta">
                {loadingDoctors ? "Loading doctors..." : `${doctors.length} specialists available`}
              </p>
            </div>

            <div className="doctor-grid">
              {doctors.map((doctor) => (
                <article key={doctor.id} className="doctor-card">
                  <img src={doctor.image} alt={doctor.name} loading="lazy" />
                  <div className="doctor-copy">
                    <p className="doctor-tag">{doctor.specialty}</p>
                    <h3>{doctor.name}</h3>
                    <p>{doctor.experience} of focused experience</p>
                    <span>{doctor.availability}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="portal-grid">
            <section className="workspace-card booking-card" id="booking">
              <div className="section-header compact">
                <div>
                  <p className="eyebrow">Patient Booking</p>
                  <h2>Request an Appointment</h2>
                </div>
                <p className="section-meta">Simple intake, no clutter</p>
              </div>
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
                  placeholder="Email address"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <select
                  required
                  value={form.doctorId}
                  onChange={(e) => setForm({ ...form, doctorId: e.target.value })}
                >
                  <option value="">Choose specialist</option>
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
                  placeholder="Briefly describe the concern"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                />
                <button type="submit" className="full-width" disabled={submitting}>
                  {submitting ? "Booking..." : "Confirm Appointment"}
                </button>
              </form>
              {result ? <p className="result">{result}</p> : null}
            </section>

            <section className="workspace-card lookup-card" id="lookup">
              <div className="section-header compact">
                <div>
                  <p className="eyebrow">Booking Lookup</p>
                  <h2>Check My Appointment</h2>
                </div>
                <p className="section-meta">Verify by phone number</p>
              </div>
              <form onSubmit={handlePatientLookup} className="booking-form">
                <input
                  required
                  placeholder="Enter phone number"
                  value={lookupPhone}
                  onChange={(e) => setLookupPhone(e.target.value)}
                />
                <button type="submit" className="full-width" disabled={lookupLoading}>
                  {lookupLoading ? "Checking..." : "Find Appointment"}
                </button>
              </form>
              {lookupResult ? <p className="result">{lookupResult}</p> : null}
              <div className="appointment-list">
                {patientAppointments.map((item) => (
                  <article key={item.id} className="appointment-card">
                    <div className="appointment-row">
                      <strong>{item.doctorName}</strong>
                      <span>{item.date}</span>
                    </div>
                    <span>{item.patientName}</span>
                    <small>{item.message || "No notes added"}</small>
                  </article>
                ))}
              </div>
            </section>
          </section>
        </main>

        <footer className="site-footer">
          <div>
            <strong>CarePoint Clinic</strong>
            <p>Private, specialist-led care with a modern patient experience.</p>
          </div>
          <button type="button" className="staff-link" onClick={() => navigateTo("/admin", setView)}>
            Staff access
          </button>
        </footer>
      </div>
    );
  }

  function renderAdminSite() {
    return (
      <div className="shell admin-shell">
        <div className="admin-layout">
          <aside className="admin-sidebar">
            <div className="admin-brand">
              <span className="brandmark-chip">CP</span>
              <div>
                <strong>CarePoint Ops</strong>
                <small>Owner console</small>
              </div>
            </div>

            <div className="admin-sidebar-block">
              <span className="sidebar-label">Workspace</span>
              <a href="/admin" className="sidebar-link active">Dashboard</a>
              <button type="button" className="sidebar-link" onClick={() => navigateTo("/", setView)}>
                Public website
              </button>
            </div>

            <div className="admin-sidebar-block">
              <span className="sidebar-label">Status</span>
              <div className="status-chip">{adminToken ? `Signed in as ${adminName}` : "Login required"}</div>
              <div className="status-note">Private operations area for the clinic owner only.</div>
            </div>
          </aside>

          <main className="admin-main">
            <section className="admin-header">
              <div>
                <p className="eyebrow">Owner Dashboard</p>
                <h1>Bookings, daily overview, and operational visibility.</h1>
                <p className="lead admin-lead">
                  Enterprise-style dashboard layout with separate login and data workspace.
                </p>
              </div>
              <div className="admin-header-actions">
                {adminToken ? (
                  <>
                    <button type="button" onClick={() => loadAdminAppointments(adminToken)} disabled={adminLoading}>
                      {adminLoading ? "Refreshing..." : "Refresh"}
                    </button>
                    <button type="button" className="button-tertiary admin-ghost" onClick={handleAdminLogout}>
                      Logout
                    </button>
                  </>
                ) : (
                  <button type="button" className="button-tertiary admin-ghost" onClick={() => navigateTo("/", setView)}>
                    Back to site
                  </button>
                )}
              </div>
            </section>

            {!adminToken ? (
              <section className="admin-login-grid">
                <section className="admin-panel admin-login-panel">
                  <div className="panel-head">
                    <h2>Sign In</h2>
                    <p>Use owner credentials to open the operations console.</p>
                  </div>
                  <form onSubmit={handleAdminLogin} className="admin-form">
                    <input
                      required
                      placeholder="Admin username"
                      value={adminCredentials.username}
                      onChange={(e) => setAdminCredentials({ ...adminCredentials, username: e.target.value })}
                    />
                    <input
                      required
                      type="password"
                      placeholder="Admin password"
                      value={adminCredentials.password}
                      onChange={(e) => setAdminCredentials({ ...adminCredentials, password: e.target.value })}
                    />
                    <button type="submit" className="full-width" disabled={adminLoading}>
                      {adminLoading ? "Signing in..." : "Login to Dashboard"}
                    </button>
                  </form>
                  {adminResult ? <p className="result">{adminResult}</p> : null}
                </section>

                <section className="admin-panel admin-preview-panel">
                  <div className="panel-head">
                    <h2>Owner View</h2>
                    <p>After login the owner sees KPI cards, today's bookings, and the full appointment register.</p>
                  </div>
                  <div className="preview-stack">
                    <div className="preview-metric">
                      <span>Today's bookings</span>
                      <strong>Live</strong>
                    </div>
                    <div className="preview-metric">
                      <span>Upcoming</span>
                      <strong>Tracked</strong>
                    </div>
                    <div className="preview-metric">
                      <span>Patient details</span>
                      <strong>Visible</strong>
                    </div>
                  </div>
                </section>
              </section>
            ) : (
              <>
                <section className="kpi-grid">
                  <article className="kpi-card">
                    <span>Total bookings</span>
                    <strong>{adminAppointments.length}</strong>
                    <small>All requests in the system</small>
                  </article>
                  <article className="kpi-card">
                    <span>Today</span>
                    <strong>{todayAppointments.length}</strong>
                    <small>Bookings scheduled for today</small>
                  </article>
                  <article className="kpi-card">
                    <span>Upcoming</span>
                    <strong>{upcomingAppointments.length}</strong>
                    <small>Today and future appointments</small>
                  </article>
                </section>

                {adminResult ? <p className="result admin-result">{adminResult}</p> : null}

                <section className="admin-data-grid">
                  <section className="admin-panel today-panel">
                    <div className="panel-head">
                      <h2>Today's Bookings</h2>
                      <p>{todayAppointments.length ? "Focused schedule for the current day." : "No appointments scheduled for today."}</p>
                    </div>
                    <div className="appointment-list">
                      {todayAppointments.map((item) => (
                        <article key={item.id} className="appointment-card appointment-card-dark">
                          <div className="appointment-row">
                            <strong>{item.patientName}</strong>
                            <span>{item.date}</span>
                          </div>
                          <span>{item.doctorName}</span>
                          <small>{item.phone}</small>
                        </article>
                      ))}
                    </div>
                  </section>

                  <section className="admin-panel register-panel">
                    <div className="panel-head">
                      <h2>Appointment Register</h2>
                      <p>Full booking visibility after successful owner login.</p>
                    </div>
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
                </section>
              </>
            )}
          </main>
        </div>
      </div>
    );
  }

  return view === "admin" ? renderAdminSite() : renderPublicSite();
}
