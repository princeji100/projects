import mongoose from 'mongoose';
const { model, models, Schema } = mongoose;

// Define the schema for the Upload model.
// D-12: makes every S3 object trackable and is the source of truth for the 25 MB quota.
const UploadSchema = new Schema({
    owner: { type: String, required: true }, // session email, matching Page.owner
    key: { type: String, required: true, unique: true }, // S3 object key
    size: { type: Number, required: true }, // bytes, summed for the quota
    url: { type: String, required: true },
}, {
    timestamps: true, // supplies createdAt
});

// The quota check aggregates by owner on every upload.
UploadSchema.index({ owner: 1 });

// Fix model initialization to handle Next.js hot reloading
export default models?.Upload || model('Upload', UploadSchema);
