import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DoctorDashboardView } from './views/DoctorDashboardView';
import { AppointmentListView } from './views/AppointmentListView';
import { AppointmentDetailView } from './views/AppointmentDetailView';
import { VideoConsultationView } from './views/VideoConsultationView';
import { PatientRecordsView } from './views/PatientRecordsView';
import { PatientDetailView } from './views/PatientDetailView';
import { EmergencyRequestsView } from './views/EmergencyRequestsView';
import { PrescriptionManagementView } from './views/PrescriptionManagementView';
import { VaccinationTrackerView } from './views/VaccinationTrackerView';
import { MedicalRecordsView } from './views/MedicalRecordsView';
import { FollowUpsView } from './views/FollowUpsView';
import { ClinicScheduleView } from './views/ClinicScheduleView';
import { LabReportsView } from './views/LabReportsView';
import { VideoConsultationsListView } from './views/VideoConsultationsListView';
import { AvailabilityCalendarView } from './views/AvailabilityCalendarView';
import { VetProfileView } from './views/VetProfileView';
import { NotificationsView } from './views/NotificationsView';

export function DoctorManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentView, setCurrentView] = useState(searchParams.get('view') || 'dashboard');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Sync state with URL parameter
  useEffect(() => {
    const view = searchParams.get('view') || 'dashboard';
    const bookingId = searchParams.get('bookingId');
    if (bookingId && (!selectedAppointment || String(selectedAppointment.id) !== String(bookingId))) {
      setSelectedAppointment({ id: bookingId });
    }
    setCurrentView(view);
  }, [searchParams, selectedAppointment]);

  const navigateTo = (view, appointment = null, patient = null) => {
    setSearchParams({ view });
    if (appointment) setSelectedAppointment(appointment);
    if (patient) setSelectedPatient(patient);
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DoctorDashboardView onNavigate={navigateTo} />;
      case 'appointments_list':
        return <AppointmentListView onNavigate={navigateTo} />;
      case 'appointment_detail':
        return <AppointmentDetailView appointment={selectedAppointment} onNavigate={navigateTo} />;
      case 'video_call':
        return <VideoConsultationView appointment={selectedAppointment || { id: searchParams.get('bookingId') }} onNavigate={navigateTo} />;
      case 'video_consultations':
        return <VideoConsultationsListView onNavigate={navigateTo} />;
      case 'patients_list':
        return <PatientRecordsView onNavigate={navigateTo} />;
      case 'patient_detail':
        return <PatientDetailView patient={selectedPatient} onNavigate={navigateTo} />;
      case 'emergency':
        return <EmergencyRequestsView onNavigate={navigateTo} />;
      case 'prescriptions':
        return <PrescriptionManagementView onNavigate={navigateTo} />;
      case 'vaccinations':
        return <VaccinationTrackerView onNavigate={navigateTo} />;
      case 'medical_records':
        return <MedicalRecordsView onNavigate={navigateTo} />;
      case 'follow_ups':
        return <FollowUpsView onNavigate={navigateTo} />;
      case 'schedule':
        return <ClinicScheduleView onNavigate={navigateTo} />;
      case 'availability':
        return <AvailabilityCalendarView />;
      case 'vet_profile':
        return <VetProfileView />;
      case 'lab_reports':
        return <LabReportsView />;
      case 'notifications':
        return <NotificationsView onNavigate={navigateTo} />;
      default:
        return <DoctorDashboardView onNavigate={navigateTo} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* The top tabs were removed here because navigation is now fully handled by the powerful Doctor Sidebar. */}
      
      {/* Render selected view */}
      <div className="mt-2">
        {renderView()}
      </div>
    </div>
  );
}

export default DoctorManagement;
