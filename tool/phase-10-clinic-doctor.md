# Phase 10 — Clinic / Veterinary Doctor Suite

**Goal:** the full clinic portal — appointments, patient records, prescriptions,
vaccinations, lab reports, follow-ups, emergency requests, messages, video consults.

**Status: ✅ Done — clinic suite live, 33/33 checks pass** · Depends on: Phases 4, 9

> Done: clinic.models (PatientRecord, MedicalRecord, Prescription, LabReport,
> FollowUp, VaccineReminder, EmergencyRequest, VideoRoom); `clinicVendorId` on
> Doctor links the clinic vendor to its doctor row. Appointment feed rides on the
> shared Booking model (type `doctor`) — serializer maps visitType→label, meta
> fallbacks let real user bookings surface as `Pending` without extra writes.
> `clinic.vendor.service` (hard-scoped by clinicVendorId): appointments list +
> confirm/complete lifecycle (completing writes a MedicalRecord + notifies owner),
> patients, medical records, prescriptions, lab reports, follow-ups (+update),
> vaccinations (grouped), emergencies (first-wins accept race guard + user-side
> `POST /doctors/emergencies` broadcast to `clinics` room), video-room creation.
> Socket.IO `/video` namespace relays WebRTC offer/answer/ICE. `ClinicVendorProvider`
> exposes the `useVendor()` surface the DoctorManagement views were built against;
> all data-feed views migrated off the legacy localStorage `tailcircle_vendor_state`
> (doctorAppointments/doctorPatients retired from `VendorContext`). Seeder `clinic`
> mirrors the mock 1:1. `scripts/phase10-check.js` — 33 checks.
>
> **Deferred (non-blocking):** the three self-contained interactive planners with
> no persisted/shared mock — Clinic Schedule grid, Availability Calendar, and the
> Messages inbox (reuse chat, Phase 11+) — plus the Notifications view (Phase 8
> notification feed wiring). These keep their local component state; they were not
> fed by the retired localStorage mock.

## Frontend screens covered
`ClinicVeterinaryDoctor/DoctorManagement.jsx` + 16 views: DoctorDashboard,
AppointmentList/Detail, AvailabilityCalendar, ClinicSchedule, EmergencyRequests,
FollowUps, LabReports, MedicalRecords, Messages, Notifications, PatientDetail,
PatientRecords, PrescriptionManagement, VaccinationTracker, VideoConsultationsList,
VideoConsultation

## Models
- **Appointment** = Booking (type clinic) enriched: `{ consultType: in_clinic|video, symptoms, doctorNotes, status: … + checked_in|in_consultation }`
- **PatientRecord**: `{ petId, clinicProviderId, mrn, bloodGroup?, chronicConditions, allergies, weightLog: [{ date, kg }] }`
- **MedicalRecord** (encounter): `{ appointmentId, petId, doctorId, diagnosis, symptoms, treatment, notes, attachments }`
- **Prescription**: `{ appointmentId, petId, doctorId, items: [{ medicine, dosage, frequency, durationDays, instructions }], status: active|completed, pdfUrl? }`
- **LabReport**: `{ petId, clinicId, testName, status: ordered|sample_collected|processing|ready, resultUrl, orderedAt }`
- **FollowUp**: `{ appointmentId, petId, dueDate, reason, status: pending|scheduled|done }`
- **EmergencyRequest**: `{ userId, petId, description, location, status: open|accepted|resolved, acceptedByClinicId }` (socket broadcast to nearby clinics)
- Vaccinations reuse Phase 2 `PetVaccination` (clinic can add records)
- Video consults: room token model `{ appointmentId, roomId, tokens }` — WebRTC signaling over Socket.IO namespace `/video`

## Endpoints (clinic-vendor scoped)
| Area | Paths |
|---|---|
| Dashboard | GET /clinic/dashboard (today's queue, stats) |
| Schedule | GET/PUT /clinic/availability (weekly template + exceptions), GET /clinic/schedule?date= |
| Appointments | GET /clinic/appointments, PATCH /:id/status, POST /:id/notes |
| Patients | GET /clinic/patients (pets seen), GET /clinic/patients/:petId (full history) |
| Records | CRUD /clinic/medical-records, prescriptions, lab-reports, follow-ups |
| Vaccination | GET/POST /clinic/patients/:petId/vaccinations |
| Emergency | GET/POST accept /clinic/emergencies; user side: POST /emergencies |
| Messages | reuse chat (`context: vendor`) between owner and clinic |
| Video | POST /clinic/appointments/:id/video-room → signaling via Socket.IO `/video` |

User-side additions: emergency request button, prescriptions/records visible under
pet profile, follow-up reminders via notify().

## Tasks
- [ ] Clinic availability engine (per-doctor calendars, exceptions) building on Phase 4 slots
- [ ] Appointment lifecycle extensions (check-in, in-consultation, completed w/ record)
- [ ] Medical records + prescriptions + lab reports + follow-ups modules
- [ ] Emergency request flow with socket broadcast + accept race handling
- [ ] Video consultation: room creation + WebRTC signaling relay over Socket.IO
- [ ] Follow-up/vaccination-due reminder cron → notify()
- [ ] **Frontend:** all 16 clinic views wired; user's DoctorDetail shows real availability; user pet profile shows records/prescriptions
- [ ] Seed: `scripts/seeders/clinic.seed.js` (registered as `clinic`) — clinic with doctors, sample patients/records mirroring the DoctorManagement mock data. **Mock retired after verify:** hardcoded arrays in `DoctorManagement.jsx` and clinic portal views

- [ ] UI audit: all covered screens + shared components mock-free (localStorage/mock-import grep)

## Security notes
- Medical data is sensitive: strict access — only the owning user and the treating clinic; audit reads/writes
- Video room tokens single-use, short-lived; signaling rooms authorized per appointment
- Emergency accept is atomic (first clinic wins)

## Exit criteria
Book a video consult as user → doctor sees it in queue → conducts consult →
writes record + prescription → user sees both under their pet; emergency flow works
across two sessions.
