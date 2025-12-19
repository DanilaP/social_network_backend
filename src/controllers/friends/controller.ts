import { Request, Response } from 'express';
import userHelpers from '../../helpers/user-helpers';
import User from '../../models/user/user';

class FriendsController {
    static async sendFriendRequest(req: Request, res: Response) {
        try {
            const user = await userHelpers.getUserFromToken(req);
            if (user && !user.sendedFriendRequests.includes(req.body.id)) {
                const modifiedUserInfo = await User.bulkWrite([
                    {
                        updateOne: {
                            filter: { 
                                _id: req.body.id 
                            },
                            update: {
                                $addToSet: { 
                                    friendRequests: user._id
                                }
                            }
                        }
                    },
                    {
                        updateOne: {
                            filter: { 
                                _id: user._id 
                            },
                            update: {
                                $addToSet: { 
                                    sendedFriendRequests: req.body.id
                                }
                            }
                        }
                    }
                ]);
                if (modifiedUserInfo.matchedCount === 0) {
                    res.status(400).json({ message: "Пользователь не найден" });
                    return;
                }
                else {
                    res.status(200).json({ message: "Заявка в друзья успешно отправлена" });
                    return;
                }
            }
            else {
                res.status(400).json({ message: "Вы уже отправили заявку в друзья данному человеку" });
                return;
            }
        }
        catch (error) {
            res.status(400).json({ message: "Ошибка при добавлении друга" });
            console.log(error);
        }
    }
    static async deleteFriendRequest(req: Request, res: Response) {
        try {
            const user = await userHelpers.getUserFromToken(req);
            if (user) {
                const modifiedUserInfo = await User.bulkWrite([
                    {
                        updateOne: {
                            filter: { 
                                _id: req.body.id 
                            },
                            update: {
                                $pull: { 
                                    friendRequests: user._id
                                }
                            }
                        }
                    },
                    {
                        updateOne: {
                            filter: { 
                                _id: user._id 
                            },
                            update: {
                                $pull: { 
                                    sendedFriendRequests: req.body.id
                                }
                            }
                        }
                    }
                ]);
                if (modifiedUserInfo.matchedCount === 0) {
                    res.status(400).json({ message: "Пользователь не найден" });
                    return;
                }
                else if (modifiedUserInfo.modifiedCount === 0) {
                    res.status(400).json({ message: "Данной заявки в друзья нету в списке отправленных вами заявок" });
                    return;
                }
                else {
                    res.status(200).json({ message: "Заявка в друзья успешно удалена" });
                    return;
                }
            }
        }
        catch (error) {
            res.status(400).json({ message: "Ошибка при удалении заявки в друзья" });
            console.log(error);
        }
    }
    static async deleteFriend(req: Request, res: Response) {
        try {
            const user = await userHelpers.getUserFromToken(req);
            if (user) {
                const result = await User.bulkWrite([
                    {
                        updateOne: {
                            filter: { 
                                _id: req.body.id 
                            },
                            update: {
                                $pull: { friends: user._id }
                            }
                        }
                    },
                    {
                        updateOne: {
                            filter: { 
                                _id: user._id 
                            },
                            update: {
                                $pull: { friends: req.body.id }
                            }
                        }
                    }
                ]);
                if (result.matchedCount < 2) {
                    res.status(400).json({ message: "Один или оба пользователя не найдены" });
                    return;
                }
                else if (result.modifiedCount === 2) {
                    res.status(200).json({ message: "Успешное удаление друга" });
                    return;
                }
            }
        }
        catch (error) {
            res.status(400).json({ message: "Ошибка при удалении друга" });
            console.log(error);
        }
    }
    static async acceptFriendRequest(req: Request, res: Response) {
        try {
            const user = await userHelpers.getUserFromToken(req);
            
            if (!user?.friendRequests.includes(req.body.id)) {
                res.status(400).json({ message: "У вас нет заявки в друзья от данного человека" });
                return;
            }
            else if (user) {
                const result = await User.bulkWrite([
                    {
                        updateOne: {
                            filter: { 
                                _id: req.body.id 
                            },
                            update: {
                                $addToSet: { friends: user._id }, 
                                $pull: { friendRequests: user._id }
                            }
                        }
                    },
                    {
                        updateOne: {
                            filter: { 
                                _id: user._id 
                            },
                            update: {
                                $addToSet: { friends: req.body.id },
                                $pull: { friendRequests: req.body.id }
                            }
                        }
                    }
                ]);
                if (result.matchedCount < 2) {
                    res.status(400).json({ message: "Один или оба пользователя не найдены" });
                    return;
                }
                else if (result.modifiedCount === 2) {
                    res.status(200).json({ message: "Успешное добавление друга" });
                    return;
                }
            }
        }
        catch (error) {
            res.status(400).json({ message: "Ошибка принятия заявки в друзья" });
            console.log(error);
        }
    }
    static async getFriendsList(req: Request, res: Response) {
        try {
            const user = await userHelpers.getUserFromToken(req);
            const userFriendsInfo: { 
                friends: { 
                    _id: string, 
                    name: string, 
                    avatar: string 
                }[] 
            }[] = await User.aggregate([
                {
                    $match: {
                        "_id": user?._id
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        let: { friendsIds: "$friends" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $in: [
                                            { $toString: "$_id" },
                                            "$$friendsIds"
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
                        as: "friends_data"
                    }
                },
                {
                    $addFields: {
                        friends: "$friends_data"
                    }
                },
                {
                    $project: {
                        _id: false,
                        friends: true
                    }
                }
            ]);
            res.status(200).json({ message: "Успешное получение списка друзей", friends: userFriendsInfo[0].friends });
        }
        catch (error) {
            res.status(400).json({ message: "Ошибка получения списка друзей" });
            console.log(error);
        }
    }
    static async getFriendRequests(req: Request, res: Response) {
        try {
            const user = await userHelpers.getUserFromToken(req);
            const userFriendRequestsInfo: { 
                friendRequests: { 
                    _id: string, 
                    name: string, 
                    avatar: string 
                }[] 
            }[] = await User.aggregate([
                {
                    $match: {
                        "_id": user?._id
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        let: { friendsRequestsIds: "$friendRequests" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $in: [
                                            { $toString: "$_id" },
                                            "$$friendsRequestsIds"
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
                        as: "friend_requests_data"
                    }
                },
                {
                    $addFields: {
                        friendRequests: "$friend_requests_data"
                    }
                },
                {
                    $project: {
                        _id: false,
                        friendRequests: true
                    }
                }
            ]);
            res.status(200).json({ 
                message: "Успешное получение списка заявок в друзья", 
                friendRequests: userFriendRequestsInfo[0].friendRequests 
            });
        }
        catch (error) {
            res.status(400).json({ message: "Ошибка получения списка заявок в друзья" });
            console.log(error);
        }
    }
}

export default FriendsController;