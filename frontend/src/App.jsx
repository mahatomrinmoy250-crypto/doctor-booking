import { useEffect, useState } from "react";
import { clinicContent } from "./content";

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

function getCurrentView() {
  return window.location.pathname.toLowerCase() === "/admin" ? "admin" : "home";
}

function navigateTo(path, setView) {
  window.history.pushState({}, "", path);
  setView(getCurrentView());
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function formatPhoneLabel(label) {
  return label;
}

function getDepartmentHighlights(doctors, department) {
  return doctors.filter((doctor) => doctor.department === department);
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
  const ophthalmologyDoctors = getDepartmentHighlights(doctors, "Ophthalmology");
  const maternityDoctors = getDepartmentHighlights(doctors, "Maternity & Gynecology");

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

  function renderUtilityBar() {
    return (
      <div className="utility-bar">
        <div className="utility-group">
          <span>{clinicContent.rating}</span>
          <small>{clinicContent.ratingNote}</small>
        </div>
        <div className="utility-group">
          <span>{clinicContent.timings.weekdays}</span>
          <small>{clinicContent.timings.sunday}</small>
        </div>
        <div className="utility-group utility-group-actions">
          <a href={clinicContent.contact.phonePrimaryHref}>{clinicContent.contact.phonePrimary}</a>
          <a href={clinicContent.contact.phoneSecondaryHref}>{clinicContent.contact.phoneSecondary}</a>
        </div>
      </div>
    );
  }

  function renderDepartmentFeature(department) {
    return (
      <article key={department.name} className="department-card">
        <p className="eyebrow">{department.label}</p>
        <h3>{department.name}</h3>
        <p className="department-copy">{department.description}</p>
        <ul className="detail-list">
          {department.bullets.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>
    );
  }

  function renderDoctorCard(doctor) {
    return (
      <article key={doctor.id} className="doctor-card">
        <div className="doctor-card-media">
          <img src={doctor.image} alt={doctor.name} loading="lazy" />
        </div>
        <div className="doctor-copy">
          <p className="doctor-tag">{doctor.department}</p>
          <h3>{doctor.name}</h3>
          <p className="doctor-title">{doctor.title}</p>
          <p className="doctor-qualifications">{doctor.qualifications}</p>
          <p>{doctor.summary}</p>
          <div className="doctor-meta">
            <span>{doctor.experience}</span>
            <span>{doctor.availability}</span>
          </div>
          <div className="chip-row">
            {doctor.specialties.map((specialty) => (
              <span key={specialty} className="soft-chip">{specialty}</span>
            ))}
          </div>
        </div>
      </article>
    );
  }

  function renderPublicSite() {
    return (
      <div className="shell">
        <div className="page-glow page-glow-left" />
        <div className="page-glow page-glow-right" />

        <header className="site-header">
          {renderUtilityBar()}
          <div className="topbar">
            <a href="#home" className="brandmark">
              <span className="brandmark-chip">SN</span>
              <span>
                <strong>{clinicContent.name}</strong>
                <small>New Baradwari, Jamshedpur</small>
              </span>
            </a>
            <nav className="topnav">
              <a href="#departments">Departments</a>
              <a href="#doctors">Doctors</a>
              <a href="#reviews">Reviews</a>
              <a href="#contact">Contact</a>
            </nav>
          </div>
        </header>

        <main>
          <section className="hero-shell reveal-rise" id="home">
            <div className="hero-copy">
              <p className="eyebrow">{clinicContent.hero.eyebrow}</p>
              <h1>{clinicContent.hero.title}</h1>
              <p className="lead">{clinicContent.hero.description}</p>
              <div className="hero-actions">
                <a href="#booking" className="button-primary">Book Consultation</a>
                <a href={clinicContent.contact.whatsappHref} className="button-secondary" target="_blank" rel="noreferrer">
                  WhatsApp Us
                </a>
                <a href={clinicContent.contact.phonePrimaryHref} className="button-secondary">
                  Call {formatPhoneLabel(clinicContent.contact.phonePrimary)}
                </a>
              </div>
              <div className="hero-note">
                <span>{clinicContent.address.landmark}</span>
                <a href={clinicContent.address.directionsHref} target="_blank" rel="noreferrer">
                  Get Directions
                </a>
              </div>
            </div>

            <div className="hero-aside">
              <article className="editorial-panel">
                <p className="eyebrow">A Trust Story Built Locally</p>
                <h2>Two specialist verticals, one polished patient experience.</h2>
                <p>
                  Patients discover eye surgery outcomes, pregnancy support, and clearer communication
                  in a clinic experience designed to feel steady from first inquiry to follow-up.
                </p>
              </article>

              <div className="hero-stats-grid">
                {clinicContent.stats.map((item) => (
                  <article key={item.label} className="stat-card">
                    <strong>{item.value}</strong>
                    <span>{item.label}</span>
                    <small>{item.detail}</small>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="trust-strip reveal-fade">
            {clinicContent.trustHighlights.map((item) => (
              <article key={item} className="trust-strip-card">
                <span className="trust-dot" />
                <p>{item}</p>
              </article>
            ))}
          </section>

          <section className="department-shell reveal-rise" id="departments">
            <div className="section-header">
              <div>
                <p className="eyebrow">Flagship Departments</p>
                <h2>Built around sharper diagnostics, gentler communication, and visible clinical trust.</h2>
              </div>
              <p className="section-meta">
                Equal focus on ophthalmology and maternity care under one premium clinic identity.
              </p>
            </div>

            <div className="department-grid">
              {clinicContent.departments.map((department) => renderDepartmentFeature(department))}
            </div>
          </section>

          <section className="specialists-panel reveal-rise" id="doctors">
            <div className="section-header">
              <div>
                <p className="eyebrow">Clinical Team</p>
                <h2>Specialist-led care anchored by the clinic's two visible faces.</h2>
              </div>
              <p className="section-meta">
                {loadingDoctors
                  ? "Loading doctor profiles..."
                  : `${ophthalmologyDoctors.length} eye specialist and ${maternityDoctors.length} women's health specialist profiles`}
              </p>
            </div>

            <div className="doctor-grid">
              {doctors.map((doctor) => renderDoctorCard(doctor))}
            </div>
          </section>

          <section className="services-shell reveal-rise">
            <div className="section-header">
              <div>
                <p className="eyebrow">Care Highlights</p>
                <h2>What patients should expect from the website and the clinic experience.</h2>
              </div>
              <p className="section-meta">Service themes are grounded in the research you supplied.</p>
            </div>

            <div className="services-grid">
              {clinicContent.serviceCards.map((service) => (
                <article key={service.title} className="service-card">
                  <h3>{service.title}</h3>
                  <p>{service.copy}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="testimonials-shell reveal-rise" id="reviews">
            <div className="section-header">
              <div>
                <p className="eyebrow">Reviews and Reputation</p>
                <h2>Paraphrased proof points that reinforce real experiences without sounding generic.</h2>
              </div>
              <p className="section-meta">A mix of ratings, review themes, and visible patient stories.</p>
            </div>

            <div className="testimonial-grid">
              {clinicContent.testimonials.map((item) => (
                <article key={item.name} className="testimonial-card">
                  <strong>{item.name}</strong>
                  <p>{item.quote}</p>
                  <small>{item.source}</small>
                </article>
              ))}
            </div>
          </section>

          <section className="contact-shell reveal-rise" id="contact">
            <div className="contact-grid">
              <section className="workspace-card booking-card" id="booking">
                <div className="section-header compact">
                  <div>
                    <p className="eyebrow">Appointments</p>
                    <h2>Request a consultation with the right specialist.</h2>
                  </div>
                  <p className="section-meta">Form request plus direct call and WhatsApp options</p>
                </div>

                <div className="contact-chip-row">
                  <a className="soft-chip soft-chip-link" href={clinicContent.contact.phonePrimaryHref}>
                    Call {clinicContent.contact.phonePrimary}
                  </a>
                  <a className="soft-chip soft-chip-link" href={clinicContent.contact.phoneSecondaryHref}>
                    Call {clinicContent.contact.phoneSecondary}
                  </a>
                  <a
                    className="soft-chip soft-chip-link"
                    href={clinicContent.contact.whatsappHref}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp
                  </a>
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
                      <option key={doc.id} value={doc.id}>
                        {doc.name} - {doc.department}
                      </option>
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
                    placeholder="Tell us about the concern or visit purpose"
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                  />
                  <button type="submit" className="full-width" disabled={submitting}>
                    {submitting ? "Booking..." : "Confirm Appointment"}
                  </button>
                </form>
                {result ? <p className="result">{result}</p> : null}
              </section>

              <section className="contact-stack">
                <article className="info-panel">
                  <p className="eyebrow">Visit the Clinic</p>
                  <h2>Find us easily in New Baradwari.</h2>
                  <p>{clinicContent.address.line}</p>
                  <div className="detail-group">
                    <span>{clinicContent.timings.weekdays}</span>
                    <span>{clinicContent.timings.sunday}</span>
                  </div>
                  <div className="contact-links">
                    <a href={clinicContent.contact.instagram} target="_blank" rel="noreferrer">Instagram</a>
                    <a href={clinicContent.contact.facebook} target="_blank" rel="noreferrer">Facebook</a>
                    <a href={clinicContent.address.directionsHref} target="_blank" rel="noreferrer">Directions</a>
                  </div>
                </article>

                <article className="map-card">
                  <iframe
                    title="Sarada Netralaya & Maternity Map"
                    src={clinicContent.address.mapEmbed}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </article>
              </section>
            </div>
          </section>

          <section className="lookup-shell reveal-fade">
            <section className="utility-card" id="lookup">
              <div className="section-header compact">
                <div>
                  <p className="eyebrow">Patient Utility</p>
                  <h2>{clinicContent.lookup.title}</h2>
                </div>
                <p className="section-meta">A quieter utility flow kept available near the footer.</p>
              </div>

              <p className="lookup-copy">{clinicContent.lookup.description}</p>

              <form onSubmit={handlePatientLookup} className="booking-form inline-form">
                <input
                  required
                  placeholder="Enter phone number"
                  value={lookupPhone}
                  onChange={(e) => setLookupPhone(e.target.value)}
                />
                <button type="submit" disabled={lookupLoading}>
                  {lookupLoading ? "Checking..." : "Find Appointment"}
                </button>
              </form>

              {lookupResult ? <p className="result">{lookupResult}</p> : null}
              <div className="appointment-list compact-list">
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
            <strong>{clinicContent.name}</strong>
            <p>{clinicContent.address.line}</p>
          </div>
          <div className="footer-meta">
            <span>{clinicContent.timings.weekdays}</span>
            <span>{clinicContent.timings.sunday}</span>
            <div className="footer-links">
              <a href={clinicContent.contact.phonePrimaryHref}>{clinicContent.contact.phonePrimary}</a>
              <a href={clinicContent.contact.phoneSecondaryHref}>{clinicContent.contact.phoneSecondary}</a>
              <button type="button" className="staff-link" onClick={() => navigateTo("/admin", setView)}>
                Staff access
              </button>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  function renderAdminSite() {
    return (
      <div className="shell admin-shell">
        <div className="page-glow page-glow-left" />
        <div className="page-glow page-glow-right" />

        <div className="admin-layout">
          <aside className="admin-sidebar">
            <div className="admin-brand">
              <span className="brandmark-chip">SN</span>
              <div>
                <strong>{clinicContent.admin.brand}</strong>
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
              <span className="sidebar-label">Clinic</span>
              <div className="status-chip">{clinicContent.shortName}</div>
              <div className="status-note">{clinicContent.admin.description}</div>
            </div>
          </aside>

          <main className="admin-main">
            <section className="admin-header">
              <div>
                <p className="eyebrow">Owner Dashboard</p>
                <h1>Bookings, daily overview, and patient operations in one place.</h1>
                <p className="lead admin-lead">
                  Same functionality as before, redesigned to match the new clinic identity.
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
                    <p>Use owner credentials to open the appointment workspace.</p>
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
                    <h2>Operational Snapshot</h2>
                    <p>Appointment visibility, today's bookings, and patient records remain unchanged functionally.</p>
                  </div>
                  <div className="preview-stack">
                    <div className="preview-metric">
                      <span>Today's bookings</span>
                      <strong>Live</strong>
                    </div>
                    <div className="preview-metric">
                      <span>Upcoming appointments</span>
                      <strong>Tracked</strong>
                    </div>
                    <div className="preview-metric">
                      <span>Patient contact details</span>
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
                    <small>All requests stored in the system</small>
                  </article>
                  <article className="kpi-card">
                    <span>Today</span>
                    <strong>{todayAppointments.length}</strong>
                    <small>Appointments scheduled for today</small>
                  </article>
                  <article className="kpi-card">
                    <span>Upcoming</span>
                    <strong>{upcomingAppointments.length}</strong>
                    <small>Today and future appointment requests</small>
                  </article>
                </section>

                {adminResult ? <p className="result admin-result">{adminResult}</p> : null}

                <section className="admin-data-grid">
                  <section className="admin-panel today-panel">
                    <div className="panel-head">
                      <h2>Today's Bookings</h2>
                      <p>
                        {todayAppointments.length
                          ? "Focused view of today's schedule."
                          : "No appointments scheduled for today."}
                      </p>
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
