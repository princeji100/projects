import { model, models, Schema } from 'mongoose';

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
    buttons:{type:Object,default:{}},
    links:{type:Object,default:[]},
}, {
    timestamps: true,
});

// Fix model initialization to handle Next.js hot reloading
export default models?.Page || model('Page', PageSchema);