import { model, models, Schema } from 'mongoose';

// Define the schema for the User model
const UserSchema = new Schema({
    name:String,
    email: String,
    image: String,
    emailVerified: Date,
}, {
    timestamps: true,
});

// Fix model initialization to handle Next.js hot reloading
export default models?.User || model('User', UserSchema);