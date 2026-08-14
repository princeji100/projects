import mongoose from 'mongoose';
const { model, models, Schema } = mongoose;

const FeedbackSchema = new Schema(
  {
    userEmail: { type: String, required: true },
    userName: { type: String, default: '' },
    type: {
      type: String,
      enum: ['bug', 'feedback', 'feature', 'other'],
      default: 'feedback',
    },
    subject: { type: String, default: '' },
    message: { type: String, required: true },
    pageUri: { type: String, default: '' },
    status: {
      type: String,
      enum: ['open', 'resolved', 'closed'],
      default: 'open',
    },
    adminNote: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

export default models?.Feedback || model('Feedback', FeedbackSchema);
