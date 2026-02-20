import { model, Schema } from 'mongoose';

const FileSchema = new Schema({
    url: { type: String, required: true },
    name: { type: String, required: true },
    size: { type: Number, required: true },
    fileType: { type: String, required: true }
});

const CommentSchema = new Schema({
    userId: String,
    text: String,
    files: [FileSchema],
    likes: [String]
});

const PostSchema = new Schema({
    date: String,
    text: String,
    files: [FileSchema],
    comments: [CommentSchema],
    likes: [String]
});

const GroupSchema = new Schema(
    {
        name: { type: String, required: true, default: "" },
        avatar: { type: String, default: "" },
        status: { type: String, required: true, default: "" },
        admin: { type: String, required: true, default: "" },
        members: [String],
        joinRequests: [String],
        posts: [PostSchema]  
    },
    {
        strict: "throw",
        strictQuery: true
    }
);

export default model('Groups', GroupSchema);