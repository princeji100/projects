import mongoose from 'mongoose';
const { model, models, Schema } = mongoose;

const InviteRequestSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    handle: { type: String, trim: true, default: '' },
    note: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export default models?.InviteRequest || model('InviteRequest', InviteRequestSchema);
