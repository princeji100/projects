import mongoose from 'mongoose';
const { model, models, Schema } = mongoose;

const LinkSchema = new Schema({
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    icon: { type: String, default: '' },
    url: { type: String, default: '' },
    active: { type: Boolean, default: true },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
}, { _id: true });

// Define the schema for the Page model
const PageSchema = new Schema({
    uri: { type: String, required: true, min: 1, unique: true },
    owner: {
        type: String,
        required: true,
    },
    displayName: { type: String, default:''},
    location: { type: String, default:''},
    bio: { type: String, default:''},
    bgType: {type: String, default:'color'},
    bgColor:{type: String, default:'#000'},
    bgImage:{type: String, default:''},
    theme: {type: String, default: 'default'},
    buttons:{type:Object,default:{}},
    links:{type: [LinkSchema], default:[]},
}, {
    timestamps: true,
});

// Fix model initialization to handle Next.js hot reloading
export default models?.Page || model('Page', PageSchema);