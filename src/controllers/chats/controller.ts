import { Request, Response } from 'express';
import { broadcastMessage } from '../../websocket/websocket';
import Dialogs from '../../models/dialogs/dialogs';
import fsHelpers from '../../helpers/fs-helpers';
import moment from 'moment';
import userHelpers from '../../helpers/user-helpers';
import mongoose from 'mongoose';
import User from '../../models/user/user';

const { ObjectId } = mongoose.Types;

class ChatController {
    static async sendMessage(req: Request, res: Response) {
        try {
            const user = await userHelpers.getUserFromToken(req);
            const sender_id = user?._id.toString();
            let { dialog_id, opponent_id, text } = req.body;

            const message = {
                date: moment(Date.now()).format('YYYY:MM:DD'),
                sender_id,
                text,
                files: req.files ? (await fsHelpers.uploadFiles(req.files)).filelist : []
            }

            if (dialog_id) {
                await Dialogs.updateOne({ _id: new ObjectId(dialog_id) }, { $push: { messages: message } });
            }
            else {
                const dialog = new Dialogs({
                    members: [sender_id, opponent_id],
                    messages: [message]
                });
                dialog_id = dialog._id;

                await User.bulkWrite([
                    {
                        updateOne: {
                            filter: { 
                                _id: new ObjectId(sender_id)
                            },
                            update: {
                                $addToSet: { dialogs: dialog_id }
                            }
                        }
                    },
                    {
                        updateOne: {
                            filter: { 
                                _id: new ObjectId(opponent_id) 
                            },
                            update: {
                                $addToSet: { dialogs: dialog_id }
                            }
                        }
                    }
                ]);
                await dialog.save();
            }

            broadcastMessage([opponent_id], {
                type: 'new_message',
                dialog_id: dialog_id,
                message
            });

            res.status(200).json({ message: "Сообщение успешно отправлено", messageInfo: message });
            return;
        }
        catch (error) {
            res.status(500).json({ message: "Ошибка при отправке сообщения" });
            console.log(error);
            return;
        }
    }
    static async deleteMessage(req: Request, res: Response) {
        try {
            const { dialog_id, message_id } = req.query;
            await Dialogs.updateOne(
                { 
                    dialog_id
                },
                { 
                    $pull: { 
                        messages: { 
                            _id: message_id
                        } 
                    } 
                }
            );
            const dialog = await Dialogs.findOne({ _id: dialog_id });
            if (dialog) {
                broadcastMessage(dialog.members, {
                    type: 'delete_message',
                    dialog_id: dialog_id,
                    messages: dialog.messages
                });
            }

            res.status(200).json({ message: "Сообщение успешно удалено" });
            return;
        }
        catch (error) {
            res.status(500).json({ message: "Ошибка при удалении сообщения" });
            console.log(error);
            return;
        }
    }
    static async changeMessage(req: Request, res: Response) {
        try {
            const { dialog_id, message_id, text } = req.body;
            const updatedDialog = await Dialogs.findOneAndUpdate(
                { 
                    _id: new ObjectId(dialog_id) 
                },
                [
                    {
                        $set: {
                            messages: {
                                $map: {
                                    input: "$messages",
                                    as: "message",
                                    in: {
                                        $cond: {
                                            if: { $eq: ["$$message._id", new ObjectId(message_id)] },
                                            then: {
                                                $mergeObjects: [
                                                    "$$message",
                                                    {
                                                        text: text
                                                    }
                                                ]
                                            },
                                            else: "$$message"
                                        }
                                    }
                                }
                            }
                        }
                    }
                ],
                {
                    returnDocument: 'after'
                }
            );
            if (!updatedDialog) {
                res.status(400).json({ message: "Диалог или сообщение не существует" });
                return;
            }
            else {
                broadcastMessage(updatedDialog.members, {
                    type: 'edit_message',
                    dialog_id: dialog_id,
                    messages: updatedDialog.messages
                });
                res.status(200).json({ message: "Сообщение успешно изменено" });
                return;
            }
        }
        catch (error) {
            res.status(500).json({ message: "Ошибка при изменении сообщения" });
            console.log(error);
            return;
        }
    }
}

export default ChatController;