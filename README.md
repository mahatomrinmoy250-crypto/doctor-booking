# CarePoint Doctor Website (Full Stack)

This project includes:
- `frontend/`: React + Vite doctor website UI
- `backend/`: Node.js + Express API for doctors and appointments
- `docker-compose.yml`: run frontend and backend together
- `render.yaml`: deploy both services on Render
- `frontend/vercel.json`: deploy frontend on Vercel

## Features
- Modern responsive homepage for a clinic/doctor brand
- Doctors listing from backend API
- Appointment booking form
- Patient self-check by phone number
- Admin dashboard for viewing all appointments with a backend admin key
- Appointment storage to JSON (`backend/data/appointments.json`)
- Health endpoint: `/api/health`

## Local Run

### 1) Backend
```bash
cd backend
npm install
npm run dev
```
Backend runs on `http://localhost:5000`

### 2) Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:5173`

Copy env examples before running:
- `backend/.env.example` -> `backend/.env`
- `frontend/.env.example` -> `frontend/.env`

Backend env values:
- `PORT=5000`
- `CORS_ORIGIN=http://localhost:5173`
- `ADMIN_KEY=your-secret-admin-key`

## Run With Docker
```bash
docker compose up --build
```
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

## API Endpoints
- `GET /api/health`
- `GET /api/doctors`
- `GET /api/appointments?phone=9876543210`
- `GET /api/admin/appointments` with header `x-admin-key: your-secret-admin-key`
- `POST /api/appointments`

### `POST /api/appointments` body
```json
{
  "patientName": "John",
  "phone": "9876543210",
  "email": "john@example.com",
  "doctorId": 1,
  "date": "2026-03-10",
  "message": "Chest discomfort"
}
```

## Deploy

### Option A: Render (frontend + backend)
1. Push this repo to GitHub.
2. In Render, create a Blueprint and point to this repo.
3. Render will pick `render.yaml` and provision both services.
4. Set `ADMIN_KEY` in Render backend environment variables.
5. Update `CORS_ORIGIN` and `VITE_API_URL` values to your real domains.

### Option B: Vercel (frontend) + Render/Railway (backend)
1. Deploy backend first and get backend URL.
2. In Vercel, deploy `frontend/`.
3. Set `VITE_API_URL` in Vercel env to backend URL.
4. Set backend `CORS_ORIGIN` to Vercel frontend domain.
5. Set backend `ADMIN_KEY` and use that same key inside the frontend admin panel.
