import { model, Schema } from 'mongoose';

const Dialogs = new Schema(
    {   
        members: [{
            type: String,
            required: true,
            default: [],
        },],
        messages: [{
            type: {
                date: String,
                text: String,
                files: [{
                    type: {
                        url: {
                            type: String,
                            required: true
                        },
                        name: {
                            type: String,
                            required: true
                        },
                        size: {
                            type: Number,
                            required: true
                        },
                        fileType: {
                            type: String,
                            required: true
                        },
                    },
                    default: []
                }],
                sender_id: String
            },
            default: [],
        }],
    },
    { 
        strict: "throw",
        strictQuery: true 
    }
);

export default model('Dialogs', Dialogs);