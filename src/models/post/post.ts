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
        likes: [{
            type: String,
            default: []
        }],
        comments: [{
            type: {
                user_id: String,
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
                likes: [{
                    type: String,
                    default: []
                }]
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