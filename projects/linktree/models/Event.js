import { model, models, Schema } from 'mongoose';

// Define the schema for the User model
const EventSchema = new Schema({
    type:String,// click or view
    page:String,// its user page
    url: String,// /linktreeaws | https://url
}, {
    timestamps: true,
});

// Fix model initialization to handle Next.js hot reloading
export default models?.Event || model('Event', EventSchema);