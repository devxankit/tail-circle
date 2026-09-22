import mongoose from 'mongoose';

const PetPromptSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, 'Prompt question is required'],
      trim: true,
    },
    answerTemplate: {
      type: String,
      required: [true, 'Answer template is required'],
      trim: true,
    },
    temperament: {
      type: String,
      default: 'Any',
      trim: true,
      index: true,
    },
    mood: {
      type: String,
      default: 'Any',
      trim: true,
      index: true,
    },
    species: {
      type: String,
      default: 'all',
      enum: ['all', 'dog', 'cat', 'bird', 'other'],
      index: true,
    },
    category: {
      type: String,
      default: 'Fun Fact',
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

PetPromptSchema.index({ temperament: 1, mood: 1, isActive: 1 });

export const PetPrompt = mongoose.model('PetPrompt', PetPromptSchema);
export default PetPrompt;
