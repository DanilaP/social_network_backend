import { Request, Response } from 'express';
import userHelpers from '../../helpers/user-helpers';
import User from '../../models/user/user';

class FriendsController {
    static async sendFriendRequest(req: Request, res: Response) {
        try {
            const user = await userHelpers.getUserFromToken(req);
            if (user) {
                const modifiedUserInfo = await User.updateOne(
                    { _id: req.body.id }, 
                    { 
                        $addToSet: { friendRequests: user._id }
                    }
                );
                if (modifiedUserInfo.matchedCount === 0) {
                    res.status(400).json({ message: "Пользователь не найден" });
                    return;
                }
                else if (modifiedUserInfo.modifiedCount === 0) {
                    res.status(400).json({ message: "Вы уже отправили заявку в друзья данному человеку" });
                    return;
                }
                else {
                    res.status(200).json({ message: "Заявка в друзья успешно отправлена" });
                    return;
                }
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
                const modifiedUserInfo = await User.updateOne(
                    { _id: req.body.id }, 
                    { 
                        $pull: { friendRequests: user._id }
                    }
                );
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
            res.status(400).json({ message: "Ошибка при добавлении друга" });
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
}

export default FriendsController;