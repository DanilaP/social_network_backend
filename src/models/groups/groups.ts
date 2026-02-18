import { model, Schema } from 'mongoose';

const Group = new Schema(
    {   
        name: {
            type: String,
            required: true,
            default: ""
        },
        avatar: {
            type: String,
            required: false,
            default: ""
        },
        status: {
            type: String,
            required: true,
            default: ""
        },
        admin: {
            type: String,
            required: true,
            default: ""
        },
        members: [{
            type: String,
            default: []
        }],
        joinRequests: [{
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

export default model('Groups', Group);