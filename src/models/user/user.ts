require('dotenv').config();
import { model, Schema } from 'mongoose';

const User = new Schema(
    {
        email: { 
            type: String, 
            unique: true, 
            required: true 
        },
        password: { 
            type: String, 
            required: true 
        },
        name: { 
            type: String, 
            required: true 
        },
        avatar: { 
            type: String,
            default: `${ process.env.HOST_URL }/files/avatar.jpeg`,
        },
        status: { 
            type: String, 
            default: "" 
        },
        posts: [{ 
            type: String, 
            default: [] 
        }],
        friends: [{
            type: String,
            default: []
        }],
        friendRequests: [{
            type: String,
            default: []
        }],
        sendedFriendRequests: [{
            type: String,
            default: []
        }],
        dialogs: [{
            type: String,
            default: []
        }],
        role: {
            type: String,
            default: "Пользователь"
        }
    },
    { 
        strict: "throw",
        strictQuery: true 
    }
);

export default model('User', User);