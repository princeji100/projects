// Default import + destructure, matching models/RateLimit.js and unlike the named imports
// elsewhere: mongoose is CJS, and bare ESM node cannot detect its named exports. Needed
// because scripts/seedAllowlist.js loads this model outside Next, under plain `node`.
import mongoose from 'mongoose';
const { model, models, Schema } = mongoose;

// Define the schema for the AllowedUser model.
// D-01: the invite-only allowlist the signIn callback reads.
const AllowedUserSchema = new Schema({
    // lowercase+trim matter: Google may return a differently-cased address than the one
    // seeded by hand, and a case mismatch would lock the owner out of their own app.
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
}, {
    timestamps: true,
});

// Fix model initialization to handle Next.js hot reloading
export default models?.AllowedUser || model('AllowedUser', AllowedUserSchema);
