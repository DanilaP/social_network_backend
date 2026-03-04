import { model, Schema } from 'mongoose';

const FileSchema = new Schema({
    url: { type: String, required: true },
    name: { type: String, required: true },
    size: { type: Number, required: true },
    fileType: { type: String, required: true }
});

const DialogsMessages = new Schema(
    {
        dialogId: { type: String, required: true },
        date: { type: String, required: true },
        text: { type: String, required: true },
        senderId: { type: String, required: true },
        files: [FileSchema],
    },
    { 
        strict: "throw",
        strictQuery: true 
    }
);

export default model('DialogsMessages', DialogsMessages);