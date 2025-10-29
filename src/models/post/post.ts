import { model, Schema } from 'mongoose';

const Post = new Schema(
    {
        user_id: { 
            type: String, 
            required: true 
        },
        date: {
            type: String,
            required: true
        },
        text: {
            type: String,
            default: ""
        },
        files: {
            type: Array,
            default: []
        },
        likes: [{
            type: String,
            default: 0
        }],
        comments: [{
            type: {
                user_id: String,
                text: String,
                files: Array,
                likes: Array
            },
            default: []
        }],
    },
    { 
        strict: "throw",
        strictQuery: true 
    }
);

export default model('Post', Post);