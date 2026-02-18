import { Request, Response } from 'express';
import User from '../../models/user/user';

class UsersController {
    static async getUsers(req: Request, res: Response) {
        try {
            const users = await User.find({}, { name: 1, avatar: 1, status: 1 });
            res.status(200).json({ message: "Успешное получение списка пользователей", users });
            return;
        }
        catch (error) {
            res.status(500).json({ message: "Ошибка получения списка пользователей" });
            console.log(error);
            return;
        }
    }
    static async getUsersWithFilters(req: Request, res: Response) {
        try {
            const filters = req.body;
            const users = await User.find(filters);
            res.status(200).json({ message: "Успешное получение фильтрованного списка пользователей", users });
            return;
        }
        catch (error) {
            res.status(500).json({ message: "Ошибка получения фильтрованного списка пользователей", users: [] });
            console.log(error);
            return;
        }
    }
}

export default UsersController;