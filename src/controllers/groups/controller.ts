import { Request, Response } from 'express';
import userHelpers from '../../helpers/user-helpers';
import Group from '../../models/groups/groups';
import User from '../../models/user/user';
import mongoose from 'mongoose';

class GroupsController {
    static async createGroup(req: Request, res: Response) {
        try {
            const user = await userHelpers.getUserFromToken(req);
            const { name, status } = req.body;

            if (name && status && user) {
                const group = new Group({
                    name: name,
                    status: status,
                    admin: user._id.toString()
                });
                await group.save();
                res.status(200).json({ message: "Группа успешно создана", group: group });
                return;
            }
            else {
                res.status(400).json({ message: "Ошибка создания группы. Имя и описание группы не могут быть пустыми" });
                return;
            }
        }
        catch (error) {
            res.status(500).json({ message: "Ошибка создания группы" });
            console.log(error);
            return;
        }
    }
    static async deleteGroup(req: Request, res: Response) {
        try {
            const user = await userHelpers.getUserFromToken(req);
            const id = req.query.id?.toString();

            if (user && id) {
                const result = await Group.deleteOne({ 
                    _id: new mongoose.Types.ObjectId(id),
                    admin: user._id
                });

                if (result.deletedCount === 1) {
                    res.status(200).json({ message: "Группа успешно удалена" });
                    return;
                }
                else {
                    res.status(400).json({ 
                        message: "Ошибка удаления группы. Группа с выбранным ID не найдена или вы не являетесь администратором данной группы" 
                    });
                    return;
                }
            }
            else {
                res.status(400).json({ message: "Ошибка удаления группы. ID группы не должен быть пустым" });
                return;
            }
        }
        catch (error) {
            res.status(500).json({ message: "Ошибка удаления группы" });
            console.log(error);
            return;
        }
    }
    static async sendJoinRequest(req: Request, res: Response) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const user = await userHelpers.getUserFromToken(req);
            const { id } = req.body;

            if (user) {
                const userId = user._id.toString();

                const updatedGroup = await Group.findOneAndUpdate(
                    { _id: new mongoose.Types.ObjectId(id) },
                    [
                        {
                            $set: {
                                joinRequests: {
                                    $cond: [
                                        { $in: [userId, "$joinRequests"] },
                                        { $filter: { input: "$joinRequests", cond: { $ne: ["$$this", userId] } } },
                                        { $concatArrays: ["$joinRequests", [userId]] }
                                    ]
                                }
                            }
                        }
                    ],
                    {
                        returnDocument: "after",
                        session
                    }
                );

                if (!updatedGroup) {
                    await session.abortTransaction();
                    session.endSession();
                    res.status(400).json({ message: "Группа не найдена" });
                    return;
                }

                const updatedUser = await User.findOneAndUpdate(
                    { _id: user._id },
                    [
                        {
                            $set: {
                                sendedApplicationsToGroups: {
                                    $cond: [
                                        { $in: [id, "$sendedApplicationsToGroups"] },
                                        { $filter: { input: "$sendedApplicationsToGroups", cond: { $ne: ["$$this", id] } } },
                                        { $concatArrays: ["$sendedApplicationsToGroups", [id]] }
                                    ]
                                }
                            }
                        }
                    ],
                    {
                        returnDocument: "after",
                        session
                    }
                );

                if (!updatedUser) {
                    await session.abortTransaction();
                    session.endSession();
                    res.status(400).json({ message: "Заявка не найдена" });
                    return;
                }

                await session.commitTransaction();
                session.endSession();

                res.status(200).json({ message: "Заявка на вступление в группу успешно подана" });
                return;
            }
        } 
        catch (error) {
            await session.abortTransaction();
            session.endSession();

            console.error(error);
            res.status(500).json({ message: "Ошибка подачи заявки на вступление в группу" });
            return;
        }
    }
    static async acceptJoinRequest(req: Request, res: Response) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const { id, requestId } = req.body;
            const user = await userHelpers.getUserFromToken(req);
            const group = await Group.findOne({ _id: new mongoose.Types.ObjectId(id) });

            if (group && user) {
                if (group.admin === user._id.toString()) {
                    const updatedGroup = await Group.findOneAndUpdate(
                        { 
                            _id: group._id, 
                            admin: user._id.toString(),
                            joinRequests: requestId 
                        },
                        {
                            $pull: { joinRequests: requestId },
                            $push: { members: requestId }
                        },
                        {
                            returnDocument: "after"
                        }
                    );
                    if (!updatedGroup) {
                        await session.abortTransaction();
                        session.endSession();

                        res.status(400).json({ message: "Группа не найдена" });
                        return;
                    }
                    else {
                        const updatedUser = await User.findOneAndUpdate(
                            { _id: user._id },
                            {
                                $pull: { sendedApplicationsToGroups: id },
                            },
                            {
                                returnDocument: "after",
                                session
                            }
                        );

                        if (!updatedUser) {
                            await session.abortTransaction();
                            session.endSession();
                            res.status(400).json({ message: "Заявка не найдена" });
                            return;
                        }
                        else {
                            await session.commitTransaction();
                            session.endSession();

                            res.status(200).json({ message: "Заявка в группа успешно принята" });
                            return;
                        }
                    }
                }
                else {
                    res.status(400).json({ message: "Вы не являетесь администратором данной группы" });
                    return;
                }
            }
            else {
                res.status(400).json({ message: "Группа или пользователь не найдены" });
                return;
            }
        }
        catch (error) {
            await session.abortTransaction();
            session.endSession();

            res.status(500).json({ message: "Ошибка при принятии заявки в группу" });
            console.log(error);
            return;
        }
    }
    static async leaveGroup(req: Request, res: Response) {
        try {
            const user = await userHelpers.getUserFromToken(req);
            const userId = user?._id.toString();
            const { id } = req.body;

            const updatedGroup = await Group.findOneAndUpdate(
                { _id: new mongoose.Types.ObjectId(id) },
                { 
                    $pull: { 
                        members: userId
                    } 
                },
                {
                    returnDocument: "after"
                }
            );

            if (!updatedGroup) {
                res.status(500).json({ message: "Группа не найдена" });
                return;
            }
            else {
                res.status(200).json({ message: "Вы успешно покинули группу" });
                return;
            }
        }
        catch (error) {
            res.status(500).json({ message: "Ошибка при выходе из группы" });
            console.log(error);
            return;
        }
    }
}

export default GroupsController;