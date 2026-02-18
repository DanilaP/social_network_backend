import { model, Schema } from 'mongoose';

const Groups = new Schema(
    {   
        avatar: {
            type: String,
            required: true
        },
        admin: {
            type: String,
            required: true
        },
        members: [{
            type: String,
            default: []
        }],
        posts: [{
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
                comments: [{
                    type: {
                        userId: String,
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

export default model('Groups', Groups);