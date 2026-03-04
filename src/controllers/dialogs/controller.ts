import { Request, Response } from 'express';
import { broadcastMessage } from '../../websocket/websocket';
import jwt, { JwtPayload } from "jsonwebtoken";
import userHelpers from '../../helpers/user-helpers';
import Dialogs from '../../models/dialogs/dialogs';
import User from '../../models/user/user';
import fsHelpers from '../../helpers/fs-helpers';
import moment from 'moment';
import mongoose from 'mongoose';
import DialogsMessages from '../../models/dialogs-messages/dialogs-messages';

const { ObjectId } = mongoose.Types;

class DialogsController {
    static async getUserDialogs(req: Request, res: Response) {
        try {
            const userId = (jwt.decode(req.cookies?.token) as JwtPayload).id.toString();

            const dialogs = await Dialogs.aggregate([
                {
                    $match: {
                        "members": userId
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        let: { memberIds: "$members" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $in: [
                                            { $toString: "$_id" },
                                            "$$memberIds"
                                        ] 
                                    }
                                }
                            },
                            {
                                $project: {
                                    _id: 1,
                                    name: 1,
                                    avatar: 1
                                }
                            }
                        ],
                        as: "members_data"
                    }
                },
                {
                    $addFields: {
                        members: "$members_data"
                    }
                },
                {
                    $project: {
                        members_data: 0
                    }
                },
                {
                    $lookup: {
                        from: "dialogsmessages",
                        let: { messagesIds: "$messages" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $in: [
                                            { $toString: "$_id" }, 
                                            "$$messagesIds"
                                        ]
                                    }
                                }
                            },
                            {
                                $project: {
                                    dialogId: 0,
                                    __v: 0
                                }
                            }
                        ],
                        as: "messages_data"
                    }
                },
                {
                    $addFields: {
                        messages: "$messages_data"
                    }
                },
                {
                    $project: {
                        __v: 0,
                        messages_data: 0
                    }
                }
            ]);

            res.status(200).json({ message: "Информация о диалогах успешно получена", dialogs });
            return;
        }
        catch (error) {
            res.status(500).json({ message: "Ошибка получения информации о диалогах" });
            console.log(error);
            return;
        }
    }
    static async deleteDialog(req: Request, res: Response) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const userId = (jwt.decode(req.cookies?.token) as JwtPayload).id.toString();

            const deletedDialogInfo = await Dialogs.findOneAndDelete(
                { 
                    _id: req.query.dialogId,
                    members: userId
                },
                { 
                    strict: "throw",
                    session 
                }
            );

            if (!deletedDialogInfo) {
                await session.abortTransaction();
                session.endSession();

                res.status(404).json({ 
                    message: "Диалог не найден или у вас нет прав для его удаления" 
                });
                return;
            }

            const updatedUsers = await User.bulkWrite(
                [
                    {
                        updateOne: {
                            filter: { 
                                _id: new ObjectId(deletedDialogInfo.members[0])
                            },
                            update: {
                                $pull: { dialogs: req.query.dialogId }
                            }
                        }
                    },
                    {
                        updateOne: {
                            filter: { 
                                _id: new ObjectId(deletedDialogInfo.members[1]) 
                            },
                            update: {
                                $pull: { dialogs: req.query.dialogId }
                            }
                        }
                    }
                ],
                { session } 
            );

            if (updatedUsers.modifiedCount === 1 || updatedUsers.modifiedCount === 0) {
                await session.abortTransaction();
                session.endSession();
                res.status(500).json({ 
                    message: "Ошибка при отправке сообщения. Один или несколько участников диалога не найдены" 
                });
                return;
            }

            if (deletedDialogInfo.messages.length !== 0) {
                const findedMessages = await DialogsMessages.find(
                    { _id: { $in: deletedDialogInfo.messages } },
                    null,
                    { session } 
                );
                const deletedMessages = await DialogsMessages.deleteMany(
                    { _id: { $in: deletedDialogInfo.messages } },
                    { 
                        strict: "throw",
                        session 
                    }
                );

                if (!deletedMessages) {
                    await session.abortTransaction();
                    session.endSession();

                    res.status(500).json({ message: "Ошибка при удалении сообщений в диалоге" });
                    return;
                }

                let filesURLs: string[] = [];

                findedMessages.map(message => {
                    message.files.map((file: any) => {
                        filesURLs = [...filesURLs, file.url.replace(process.env.HOST_URL, `./static`)];
                    })
                })

                const deletedFiles = (await fsHelpers.removeFiles(filesURLs));

                if (deletedFiles.status === 500) {
                    await session.abortTransaction();
                    session.endSession();
                    res.status(500).json({ message: "Ошибка при удалении файлов в статике" });
                    return;
                }
                
            }

            await session.commitTransaction();
            session.endSession();

            res.status(200).json({ message: "Диалог успешно удален" });
            return;
        }
        catch (error) {
            await session.abortTransaction();
            session.endSession();

            res.status(500).json({ message: "Ошибка при удалении диалога" });
            console.log(error);
            return;
        }
    }
    static async sendMessage(req: Request, res: Response) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const userId = (jwt.decode(req.cookies?.token) as JwtPayload).id.toString();
            const senderId = userId;
            let { dialogId, opponentId, text } = req.body;

            const message = new DialogsMessages({
                dialogId: dialogId ? dialogId : "",
                date: moment(Date.now()).format('DD:MM:YYYY HH:mm:ss'),
                senderId,
                text,
                files: req.files ? (await fsHelpers.uploadFiles(req.files)).filelist : []
            });
            
            //Если dialogId передали
            if (dialogId) {
                const updatedDialog = await Dialogs.updateOne(
                    { 
                        _id: new ObjectId(dialogId),
                        members: opponentId
                    }, 
                    { $push: { messages: message._id.toString() } },
                    { session } 
                );

                if (updatedDialog.modifiedCount === 0) {
                    await session.abortTransaction();
                    session.endSession();
                    res.status(500).json({ 
                        message: "Ошибка при отправке сообщения. Диалог не найден, либо вы не являтесь его участником" 
                    });
                    return;
                }
            }
            //Если dialogId не передали
            else {
                const existedDialog = await Dialogs.findOne(
                    {
                        members: { $all: [opponentId, senderId] }
                    },
                    null,
                    { session } 
                );

                //Если Dialog не существует
                if (!existedDialog) {
                    const dialog = new Dialogs({
                        members: [senderId, opponentId],
                        messages: [message._id.toString()]
                    });
                    dialogId = dialog._id.toString();
                    message.dialogId = dialogId;

                    const savedDialog = await dialog.save({ session: session });

                    if (!savedDialog._id) {
                        await session.abortTransaction();
                        session.endSession();
                        res.status(500).json({ message: "Ошибка при отправке сообщения" });
                        return;
                    }

                    const updatedUsers = await User.bulkWrite(
                        [
                            {
                                updateOne: {
                                    filter: { 
                                        _id: new ObjectId(senderId)
                                    },
                                    update: {
                                        $addToSet: { dialogs: dialogId }
                                    }
                                }
                            },
                            {
                                updateOne: {
                                    filter: { 
                                        _id: new ObjectId(opponentId) 
                                    },
                                    update: {
                                        $addToSet: { dialogs: dialogId }
                                    }
                                }
                            }
                        ],
                        { session } 
                    );

                    if (updatedUsers.modifiedCount === 1 || updatedUsers.modifiedCount === 0) {
                        await session.abortTransaction();
                        session.endSession();
                        res.status(500).json({ 
                            message: "Ошибка при отправке сообщения. Один или несколько участников диалога не найдены" 
                        });
                        return;
                    }
                }
                //Если Dialog уже существует, но dialogId не отправили
                else {
                    dialogId = existedDialog._id.toString();
                    message.dialogId = dialogId;

                    const updatedDialog = await Dialogs.updateOne(
                        { 
                            _id: new ObjectId(dialogId),
                            members: opponentId
                        },
                        { $push: { messages: message._id.toString() } },
                        { session }
                    );

                    if (updatedDialog.modifiedCount === 0) {
                        await session.abortTransaction();
                        session.endSession();
                        res.status(500).json({ 
                            message: "Ошибка при отправке сообщения. Диалог не найден или вы не являетесь его участником" 
                        });
                        return;
                    }
                }
            }

            const savedMessage = await message.save({ session: session });
                
            if (!savedMessage._id) {
                await session.abortTransaction();
                session.endSession();
                res.status(500).json({ message: "Ошибка при отправке сообщения" });
                return;
            }

            await session.commitTransaction();
            session.endSession();

            broadcastMessage([opponentId], {
                type: 'new_message',
                dialog_id: dialogId,
                message
            });

            res.status(200).json({ message: "Сообщение успешно отправлено", messageInfo: message });
            return;
        }
        catch (error) {
            await session.abortTransaction();
            session.endSession();

            res.status(500).json({ message: "Ошибка при отправке сообщения" });
            console.log(error);
            return;
        }
    }
    static async deleteMessage(req: Request, res: Response) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const userId = (jwt.decode(req.cookies?.token) as JwtPayload).id.toString();
            const { dialogId, messageId } = req.query;

            if (dialogId && messageId) {
                const updatedDialog = await Dialogs.findOneAndUpdate(
                    { 
                        dialogId,
                        members: userId
                    },
                    { 
                        $pull: { 
                            messages: messageId
                        } 
                    },
                    { 
                        session,
                        new: true 
                    }
                );

                if (!updatedDialog) {
                    await session.abortTransaction();
                    session.endSession();
                    res.status(500).json({ 
                        message: "Ошибка при удалении сообщения. Диалог не найден или вы не являетесь его участником" 
                    });
                    return;
                }

                else {
                    const modifiedMessageId = messageId.toString();

                    const deletedMessage = await DialogsMessages.findOneAndDelete(
                        { _id: new ObjectId(modifiedMessageId) },
                        { 
                            session,
                            new: true 
                        }
                    );

                    if (!deletedMessage) {
                        await session.abortTransaction();
                        session.endSession();
                        res.status(500).json({ message: "Ошибка при удалении сообщения. Сообщение не найдено" });
                        return;
                    }

                    const filesURLs = deletedMessage.files.map((file: any) => {
                        return file.url.replace(process.env.HOST_URL, `./static`);
                    });
                    const deletedFiles = (await fsHelpers.removeFiles(filesURLs));

                    if (deletedFiles.status === 500) {
                        await session.abortTransaction();
                        session.endSession();
                        res.status(500).json({ message: "Ошибка при удалении файлов в статике" });
                        return;
                    }
                }

                await session.commitTransaction();
                session.endSession();

                broadcastMessage(updatedDialog.members, {
                    type: 'delete_message',
                    dialog_id: dialogId,
                    messages: updatedDialog.messages
                });

                res.status(200).json({ message: "Сообщение успешно удалено" });
                return;
            }
            else {
                await session.abortTransaction();
                session.endSession();
                res.status(400).json({ message: "ID сообщения и ID диалога не должны быть пустыми" });
                return;
            }
        }
        catch (error) {
            await session.abortTransaction();
            session.endSession();

            res.status(500).json({ message: "Ошибка при удалении сообщения" });
            console.log(error);
            return;
        }
    }
    static async changeMessage(req: Request, res: Response) {
        try {
            const { dialogId, messageId, text } = req.body;
            const userId = (jwt.decode(req.cookies?.token) as JwtPayload).id.toString();
            
            const updatedMessage = await DialogsMessages.findOneAndUpdate(
                { 
                    _id: new ObjectId(messageId),
                    senderId: userId,
                    dialogId: dialogId
                },
                {
                    $set: {
                        text: text
                    }
                },
                {
                    strict: 'throw',
                    returnDocument: 'after'
                }
            );

            if (!updatedMessage) {
                res.status(400).json({ message: "Диалог или сообщение не существует" });
                return;
            }
            else {
                const dialog = await Dialogs.findOne({ _id: new ObjectId(dialogId) });

                broadcastMessage(dialog!.members, {
                    type: 'edit_message',
                    dialogId: dialogId,
                    message: updatedMessage
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

export default DialogsController;