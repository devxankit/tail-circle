import mongoose from 'mongoose';

/**
 * Vaccination records per pet — shown in the pet passport and reused by the
 * clinic suite (Phase 10) for doctor-entered records.
 */
const petVaccinationSchema = new mongoose.Schema(
  {
    petId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pet',
      required: true,
      index: true,
    },
    vaccine: { type: String, trim: true, required: true },
    date: { type: Date, required: true },
    nextDueDate: { type: Date, default: null },
    docUrl: { type: String, default: '' },
    // Set when a clinic doctor records it (Phase 10)
    recordedByVendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

export const PetVaccination = mongoose.model('PetVaccination', petVaccinationSchema);
export default PetVaccination;
