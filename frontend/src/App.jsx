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
    title: "Preventive Medicine",
    copy: "Executive checkups, screening plans, and long-view health strategy."
  },
  {
    title: "Specialist Access",
    copy: "Fast routing to trusted clinicians without a cluttered booking experience."
  },
  {
    title: "Continuity of Care",
    copy: "Digital intake and follow-up visibility that keeps care calm and coordinated."
  }
];

const proofPoints = [
  { value: "15+", label: "Years of clinical trust" },
  { value: "12k", label: "Consultations delivered" },
  { value: "4.9/5", label: "Average patient rating" }
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
            <a href="#booking">Booking</a>
            <a href="#lookup">Check Booking</a>
          </nav>
        </header>

        <main>
          <section className="hero-panel" id="home">
            <div className="hero-copy">
              <p className="kicker">Modern Clinical Experience</p>
              <h1>Private medical care designed with the polish patients expect today.</h1>
              <p className="hero-summary">
                A premium digital front door for serious care: elegant booking, specialist visibility,
                and a patient experience that feels calm, fast, and trustworthy.
              </p>
              <div className="hero-actions">
                <a href="#booking" className="button-primary">Book Consultation</a>
                <a href="#specialists" className="button-secondary">View Specialists</a>
              </div>
              <div className="hero-proof">
                {proofPoints.map((item) => (
                  <div key={item.label} className="proof-card">
                    <strong>{item.value}</strong>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <aside className="hero-aside">
              <div className="executive-card">
                <p className="kicker">Patient Promise</p>
                <h2>Clean digital access without the chaos of old-school hospital websites.</h2>
                <ul className="feature-list">
                  <li>Specialist-first booking flow</li>
                  <li>Easy appointment verification by phone</li>
                  <li>Luxury-style visual language with clear trust signals</li>
                </ul>
              </div>
              <div className="hours-card">
                <span>Appointments accepted</span>
                <strong>Mon-Sat</strong>
                <p>08:00 AM to 08:00 PM</p>
              </div>
            </aside>
          </section>

          <section className="editorial-strip">
            <div>
              <p className="kicker">Why It Feels Different</p>
              <h2>Built to feel closer to a modern private healthcare brand than a local clinic template.</h2>
            </div>
            <div className="service-grid">
              {services.map((service) => (
                <article key={service.title} className="service-card">
                  <h3>{service.title}</h3>
                  <p>{service.copy}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="specialists-panel" id="specialists">
            <div className="section-header">
              <div>
                <p className="kicker">Specialists</p>
                <h2>Doctors introduced with clarity, hierarchy, and confidence.</h2>
              </div>
              <p className="section-meta">
                {loadingDoctors ? "Loading doctors..." : `${doctors.length} specialists available`}
              </p>
            </div>

            <div className="doctor-grid premium-grid">
              {doctors.map((doctor) => (
                <article key={doctor.id} className="doctor-card premium-card">
                  <div className="doctor-media">
                    <img src={doctor.image} alt={doctor.name} loading="lazy" />
                  </div>
                  <div className="doctor-body">
                    <p className="doctor-tag">{doctor.specialty}</p>
                    <h3>{doctor.name}</h3>
                    <p>{doctor.experience} of focused experience</p>
                    <span>{doctor.availability}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="workspace-grid" id="booking">
            <section className="workspace-card booking-card">
              <div className="section-header compact">
                <div>
                  <p className="kicker">Patients</p>
                  <h2>Book an Appointment</h2>
                </div>
                <p className="section-meta">A premium intake experience with zero clutter</p>
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
                  <p className="kicker">Self Service</p>
                  <h2>Check My Booking</h2>
                </div>
                <p className="section-meta">Patients can verify appointments instantly</p>
              </div>
              <form onSubmit={handlePatientLookup} className="booking-form">
                <input
                  required
                  placeholder="Enter phone number"
                  value={lookupPhone}
                  onChange={(e) => setLookupPhone(e.target.value)}
                />
                <button type="submit" className="full-width" disabled={lookupLoading}>
                  {lookupLoading ? "Checking..." : "Find Appointments"}
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
            Clinic staff access
          </button>
        </footer>
      </div>
    );
  }

  function renderAdminSite() {
    return (
      <div className="shell admin-shell">
        <div className="ambient ambient-one" />
        <div className="ambient ambient-two" />

        <header className="topbar admin-topbar">
          <a href="/" className="brandmark" onClick={(e) => { e.preventDefault(); navigateTo("/", setView); }}>
            <span className="brandmark-chip">CP</span>
            <span>
              <strong>CarePoint Owner Console</strong>
              <small>Private operational dashboard</small>
            </span>
          </a>
          <button type="button" className="button-tertiary" onClick={() => navigateTo("/", setView)}>
            Back to Website
          </button>
        </header>

        <main>
          <section className="admin-hero">
            <div>
              <p className="kicker">Owner Dashboard</p>
              <h1>Operational control without exposing admin tools to patients.</h1>
              <p className="hero-summary">
                This is the private clinic console. Patients should never land here during normal browsing,
                and the full dashboard appears only after owner login.
              </p>
            </div>
            <div className="admin-hero-chip">
              <span>Secure area</span>
              <strong>{adminToken ? `Logged in as ${adminName}` : "Authentication required"}</strong>
            </div>
          </section>

          {!adminToken ? (
            <section className="admin-login-layout">
              <section className="workspace-card admin-login-card">
                <p className="kicker">Sign In</p>
                <h2>Owner Login</h2>
                <p className="muted dark-muted">
                  Use owner credentials to unlock the appointment dashboard.
                </p>
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

              <section className="workspace-card admin-side-card">
                <p className="kicker">What Owner Sees</p>
                <h2>Today’s count, upcoming appointments, and the complete booking register.</h2>
                <ul className="feature-list dark-list">
                  <li>Today bookings summary</li>
                  <li>Upcoming schedule visibility</li>
                  <li>Live appointment table after login</li>
                </ul>
              </section>
            </section>
          ) : (
            <section className="admin-dashboard">
              <section className="workspace-card admin-controls-card">
                <div className="owner-actions">
                  <div>
                    <p className="kicker">Signed In</p>
                    <h2>Welcome, {adminName}</h2>
                    <p className="muted dark-muted">Refresh data anytime or sign out securely.</p>
                  </div>
                  <div className="admin-toolbar">
                    <button type="button" onClick={() => loadAdminAppointments(adminToken)} disabled={adminLoading}>
                      {adminLoading ? "Refreshing..." : "Refresh Appointments"}
                    </button>
                    <button type="button" className="button-tertiary" onClick={handleAdminLogout}>
                      Logout
                    </button>
                  </div>
                </div>
                {adminResult ? <p className="result">{adminResult}</p> : null}
                <div className="stats-grid">
                  <article className="stat-card stat-card-dark">
                    <span>Total bookings</span>
                    <strong>{adminAppointments.length}</strong>
                  </article>
                  <article className="stat-card stat-card-dark">
                    <span>Today</span>
                    <strong>{todayAppointments.length}</strong>
                  </article>
                  <article className="stat-card stat-card-dark">
                    <span>Upcoming</span>
                    <strong>{upcomingAppointments.length}</strong>
                  </article>
                </div>
              </section>

              <section className="admin-summary-grid">
                <section className="workspace-card admin-summary-card">
                  <p className="kicker">Today Bookings</p>
                  <h2>{todayAppointments.length ? "Today’s schedule is ready." : "No bookings scheduled for today."}</h2>
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

                <section className="workspace-card admin-table-card">
                  <div className="table-header">
                    <h3>Appointment Register</h3>
                    <p className="muted dark-muted">Full booking visibility after successful owner login.</p>
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
            </section>
          )}
        </main>
      </div>
    );
  }

  return view === "admin" ? renderAdminSite() : renderPublicSite();
}
