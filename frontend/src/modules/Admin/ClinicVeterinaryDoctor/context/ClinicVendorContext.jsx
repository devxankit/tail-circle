import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  fetchClinicAppointments,
  updateClinicAppointmentStatus,
  addClinicConsultationNotes,
  createClinicVideoRoom,
  fetchClinicPatients,
  fetchClinicMedicalRecords,
  createClinicMedicalRecord,
  fetchClinicPrescriptions,
  createClinicPrescription,
  fetchClinicLabReports,
  fetchClinicFollowUps,
  createClinicFollowUp,
  updateClinicFollowUp,
  fetchClinicVaccinations,
  fetchClinicEmergencies,
  acceptClinicEmergency,
  declineClinicEmergency,
  getStoredVendor,
} from '../../../../services/vendor';

/**
 * Real-data context for the Clinic / Veterinary Doctor portal. Exposes the same
 * `useVendor()` surface the DoctorManagement views were built against
 * (doctorAppointments, doctorPatients, updateDoctorAppointmentStatus,
 * addDoctorConsultationNotes) plus the medical suite (records, prescriptions,
 * labs, follow-ups, vaccinations, emergencies) — all served by the API.
 */
const ClinicVendorContext = createContext();

export function ClinicVendorProvider({ children }) {
  const stored = getStoredVendor();
  const [profile] = useState(stored?.profile || null);
  const [doctorAppointments, setDoctorAppointments] = useState([]);
  const [doctorPatients, setDoctorPatients] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [labReports, setLabReports] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [vaccinations, setVaccinations] = useState({ upcoming: [], missed: [], completed: [] });
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [appts, patients, records, rx, labs, fus, vax, ems] = await Promise.all([
        fetchClinicAppointments(),
        fetchClinicPatients(),
        fetchClinicMedicalRecords(),
        fetchClinicPrescriptions(),
        fetchClinicLabReports(),
        fetchClinicFollowUps(),
        fetchClinicVaccinations(),
        fetchClinicEmergencies(),
      ]);
      setDoctorAppointments(appts || []);
      setDoctorPatients(patients || []);
      setMedicalRecords(records || []);
      setPrescriptions(rx || []);
      setLabReports(labs || []);
      setFollowUps(fus || []);
      setVaccinations(vax || { upcoming: [], missed: [], completed: [] });
      setEmergencies(ems || []);
    } catch (err) {
      console.error('Failed to load clinic data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /* ── Appointment mutations (optimistic) ─────────────────── */
  const updateDoctorAppointmentStatus = async (id, status) => {
    setDoctorAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    try {
      const updated = await updateClinicAppointmentStatus(id, status);
      setDoctorAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)));
    } catch (err) {
      console.error('Failed to update appointment', err);
      refresh();
    }
  };

  const addDoctorConsultationNotes = async (id, notes) => {
    setDoctorAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, notes, status: 'Completed' } : a)));
    try {
      const updated = await addClinicConsultationNotes(id, notes);
      setDoctorAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)));
      fetchClinicMedicalRecords().then(setMedicalRecords).catch(() => {});
    } catch (err) {
      console.error('Failed to save notes', err);
      refresh();
    }
  };

  /**
   * Superseded by the WebRTC consult flow. The vet's call screen now drives
   * `startCall()` from CallContext, which hits POST /consults/:bookingId/start
   * and returns a real room name + TURN credentials. The old endpoint minted a
   * random string that no media server ever validated.
   */
  const startVideoRoom = async (id) => {
    console.warn('startVideoRoom is deprecated — use useCall().startCall(bookingId)');
    return null;
  };

  /* ── Medical suite mutations ────────────────────────────── */
  const addMedicalRecord = async (body) => {
    const rec = await createClinicMedicalRecord(body);
    setMedicalRecords((prev) => [rec, ...prev]);
    return rec;
  };

  const addPrescription = async (body) => {
    const rx = await createClinicPrescription(body);
    setPrescriptions((prev) => [rx, ...prev]);
    return rx;
  };

  const addFollowUp = async (body) => {
    const fu = await createClinicFollowUp(body);
    setFollowUps((prev) => [fu, ...prev]);
    return fu;
  };

  const patchFollowUp = async (id, patch) => {
    const fu = await updateClinicFollowUp(id, patch);
    setFollowUps((prev) => prev.map((f) => (f._id === id ? fu : f)));
    return fu;
  };

  const acceptEmergency = async (id) => {
    const res = await acceptClinicEmergency(id);
    setEmergencies((prev) => prev.filter((e) => e._id !== id));
    return res;
  };

  const declineEmergency = async (id) => {
    await declineClinicEmergency(id);
    setEmergencies((prev) => prev.filter((e) => e._id !== id));
  };

  return (
    <ClinicVendorContext.Provider
      value={{
        profile,
        loading,
        doctorAppointments,
        doctorPatients,
        medicalRecords,
        prescriptions,
        labReports,
        followUps,
        vaccinations,
        emergencies,
        refresh,
        updateDoctorAppointmentStatus,
        addDoctorConsultationNotes,
        startVideoRoom,
        addMedicalRecord,
        addPrescription,
        addFollowUp,
        patchFollowUp,
        acceptEmergency,
        declineEmergency,
      }}
    >
      {children}
    </ClinicVendorContext.Provider>
  );
}

export const useVendor = () => useContext(ClinicVendorContext);
export const useClinic = () => useContext(ClinicVendorContext);
