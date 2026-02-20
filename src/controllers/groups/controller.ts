import { Request, Response } from 'express';
import jwt, { JwtPayload } from "jsonwebtoken";
import userHelpers from '../../helpers/user-helpers';
import Group from '../../models/groups/groups';
import User from '../../models/user/user';
import mongoose from 'mongoose';
import moment from 'moment';
import fsHelpers from '../../helpers/fs-helpers';

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
                res.status(400).json({ message: "Группа не найдена" });
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
    static async kickOutUserFromGroup(req: Request, res: Response) {
        try {
            const user = await userHelpers.getUserFromToken(req);
            const userId = user?._id.toString();
            const { groupId, memberId } = req.body;

            const updatedGroup = await Group.findOneAndUpdate(
                { _id: new mongoose.Types.ObjectId(groupId), admin: userId },
                { 
                    $pull: { 
                        members: memberId
                    } 
                },
                {
                    returnDocument: "after"
                }
            );

            if (!updatedGroup) {
                res.status(400).json({ message: "Группа не найдена или вы не являетесь администратором данной группы" });
                return;
            }
            else {
                res.status(200).json({ message: "Вы успешно удалили пользователя из группы" });
                return;
            }
        }
        catch (error) {
            res.status(500).json({ message: "Ошибка при удалении пользователя из группы" });
            console.log(error);
            return;
        }
    }
    static async createPost(req: Request, res: Response) {
        try {
            const user = await userHelpers.getUserFromToken(req);
            const userId = user?._id.toString();
            const { text, groupId } = req.body;

            if (text) {
                const post = { 
                    text: text,
                    date: moment(Date.now()).format('DD MMMM YYYY HH:mm'),
                    files: req.files ? (await fsHelpers.uploadFiles(req.files)).filelist : [],
                    comments: [],
                    likes: []
                };
                
                const updatedGroup = await Group.findOneAndUpdate(
                    { _id: new mongoose.Types.ObjectId(groupId), admin: userId },
                    { 
                        $push: { 
                            posts: post
                        } 
                    },
                    {
                        returnDocument: "after"
                    }
                );

                if (!updatedGroup) {
                    res.status(400).json({ message: "Группа не найдена или вы не являетесь администратором данной группы" });
                    return;
                }
                else {
                    res.status(200).json({ message: "Вы успешно создали пост в группе" });
                    return;
                }
            }
            else {
                res.status(400).json({ message: "Текст поста не может быть пустым" });
                return;
            }
        }
        catch (error) {
            res.status(500).json({ message: "Ошибка при создании поста в группе" });
            console.log(error);
            return;
        }
    }
    static async deletePost(req: Request, res: Response) {
        try {
            const user = await userHelpers.getUserFromToken(req);
            const userId = user?._id.toString();
            const { postId, groupId } = req.body;

            if (postId) {
                const modifiedGroupId = groupId;
                const modifiedPostId = postId;

                const updatedGroup = await Group.findOneAndUpdate(
                    { 
                        _id: modifiedGroupId, 
                        admin: userId, 
                        'posts._id': modifiedPostId 
                    },
                    { 
                        $pull: { 
                            posts: {
                                _id: modifiedPostId
                            }
                        } 
                    },
                    {
                        returnDocument: "after"
                    }
                );
                
                if (!updatedGroup) {
                    res.status(400).json({ message: "Ошибка при удалении поста в группе" });
                    return;
                }
                else {
                    res.status(200).json({ message: "Вы успешно удалили пост из группы" });
                    return;
                }
            }
            else {
                res.status(400).json({ message: "ID поста и ID группы не могут быть пустыми" });
                return;
            }
        }
        catch (error) {
            res.status(500).json({ message: "Ошибка при удалении поста в группе" });
            console.log(error);
            return;
        }
    }
    static async likePost(req: Request, res: Response) {
        try {
            const userId = (jwt.decode(req.cookies?.token) as JwtPayload).id.toString();
            const { groupId, postId } = req.body;

            if (userId && postId && groupId) {
                const modifiedGroupId = new mongoose.Types.ObjectId(groupId);
                const modifiedPostId = new mongoose.Types.ObjectId(postId); 

                const updatedGroup = await Group.findOneAndUpdate(
                    { _id: modifiedGroupId, 'posts._id': modifiedPostId }, 
                    [
                        {
                            $set: {
                                posts: {
                                    $map: {
                                        input: "$posts",
                                        as: "post",
                                        in: {
                                            $cond: {
                                                if: { $eq: ["$$post._id", modifiedPostId] },
                                                then: {
                                                    $mergeObjects: [
                                                        "$$post",
                                                        {
                                                            likes: {
                                                                $cond: {
                                                                    if: { $in: [userId, "$$post.likes"] },
                                                                    then: { 
                                                                        $filter: { 
                                                                            input: "$$post.likes", 
                                                                            cond: { $ne: ["$$this", userId] } 
                                                                        } 
                                                                    },
                                                                    else: { $concatArrays: ["$$post.likes", [userId]] }
                                                                }
                                                            }
                                                        }
                                                    ]
                                                },
                                                else: "$$post"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    ],
                    {
                        returnDocument: "after"
                    }
                );

                if (!updatedGroup) {
                    res.status(400).json({ message: "Группа или пост не найдены" });
                    return;
                }
                else {
                    res.status(200).json({ message: "Информация о посте успешно изменена" });
                    return;
                }
            }
            else {
                res.status(400).json({ message: "Переданные данные не должны быть пустыми" });
                return;
            }
        }
        catch (error) {
            res.status(500).json({ message: "Ошибка при изменении информации о посте" });
            console.log(error);
            return;
        }
    }
    static async addCommentToPost(req: Request, res: Response) {
        try {
            const userId = (jwt.decode(req.cookies?.token) as JwtPayload).id.toString();
            const { groupId, postId, text } = req.body;

            if (groupId && postId && text) {
                const modifiedGroupId = new mongoose.Types.ObjectId(groupId);
                const modifiedPostId = new mongoose.Types.ObjectId(postId); 

                const comment = {
                    userId: userId,
                    text: text,
                    files: req.files ? (await fsHelpers.uploadFiles(req.files)).filelist : [],
                    likes: [],
                };

                const updatedGroup = await Group.findOneAndUpdate(
                    { 
                        _id: modifiedGroupId, 'posts._id': modifiedPostId
                    },
                    [
                        {
                            $set: {
                                posts: {
                                    $map: {
                                        input: "$posts",
                                        as: "post",
                                        in: {
                                            $cond: {
                                                if: { $eq: ["$$post._id", modifiedPostId] },
                                                then: {
                                                    $mergeObjects: [
                                                        "$$post",
                                                        {
                                                            comments: {
                                                                $concatArrays: ["$$post.comments", [comment]]
                                                            }
                                                        }
                                                    ]
                                                },
                                                else: "$$post"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    ],
                    {
                        returnDocument: "after"
                    }
                );

                if (!updatedGroup) {
                    res.status(400).json({ message: "Группа или пост не найдены" });
                    return;
                }
                else {
                    res.status(200).json({ message: "Комментарий успешно создан", updatedGroup });
                    return;
                }
            }
            else {
                res.status(400).json({ message: "Ошибка при создании комментария к посту" });
                return;
            }
        }
        catch (error) {
            res.status(500).json({ message: "Ошибка при создании комментария к посту" });
            console.log(error);
            return;
        }
    }
    static async deleteComment(req: Request, res: Response) {
        try {
            const userId = (jwt.decode(req.cookies?.token) as JwtPayload).id.toString();
            const { groupId, postId, commentId } = req.body;

            if (groupId && postId && commentId) {
                const modifiedGroupId = new mongoose.Types.ObjectId(groupId);
                const modifiedPostId = new mongoose.Types.ObjectId(postId);
                const modifiedCommentId =  new mongoose.Types.ObjectId(commentId);

                const updatedGroup = await Group.findOneAndUpdate(
                    {
                        _id: modifiedGroupId,
                        admin: userId,
                        "posts._id": modifiedPostId
                    },
                    [
                        {
                            $set: {
                                posts: {
                                    $map: {
                                        input: "$posts",
                                        as: "post",
                                        in: {
                                            $cond: {
                                                if: { $eq: ["$$post._id", modifiedPostId] },
                                                then: {
                                                    $mergeObjects: [
                                                        "$$post",
                                                        {
                                                            comments: {
                                                                $filter: {
                                                                    input: "$$post.comments",
                                                                    as: "comment",
                                                                    cond: { $ne: ["$$comment._id", modifiedCommentId] }
                                                                }
                                                            }
                                                        }
                                                    ]
                                                },
                                                else: "$$post"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    ],
                    {
                        returnDocument: "after"
                    }
                );

                if (!updatedGroup) {
                    res.status(400).json({ message: "Комментарий или группа не найдена" });
                    return;
                }
                else {
                    res.status(200).json({ message: "Комментарий успешно удален" });
                    return;
                }
            }
            else {
                res.status(400).json({ message: "ID группы, поста и комментария не должны быть пустыми" });
                return;
            }
        }   
        catch (error) {
            res.status(500).json({ message: "Ошибка при удалении комментария под постом" });
            console.log(error);
            return;
        }
    }
}

export default GroupsController;