import { model, Schema } from 'mongoose';

const Dialogs = new Schema(
    {   
        members: [{
            type: String,
            required: true,
            default: [],
        }],
        messages: [{
            type: String,
            required: true,
            default: [],
        }],
    },
    { 
        strict: "throw",
        strictQuery: true 
    }
);

export default model('Dialogs', Dialogs);