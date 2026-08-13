import mongoose from 'mongoose';
const { model, models, Schema } = mongoose;

// Define the schema for the User model
const EventSchema = new Schema({
    type: { type: String, required: true }, // click or view
    page: { type: String, required: true }, // page uri
    url: { type: String, default: '' },     // clicked link url or page uri
    device: { type: String, enum: ['mobile', 'desktop', 'tablet', 'other'] },
    referrer: { type: String },
}, {
    timestamps: true,
});

// Fix model initialization to handle Next.js hot reloading
export default models?.Event || model('Event', EventSchema);