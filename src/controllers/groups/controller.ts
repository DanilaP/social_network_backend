import { Request, Response } from 'express';

class GroupsController {
    static async createGroup(req: Request, res: Response) {
        try {
            
        }
        catch (error) {
            res.status(500).json({ message: "Ошибка создания группы" });
            console.log(error);
            return;
        }
    }
    static async joinGroup(req: Request, res: Response) {
        try {
            
        }
        catch (error) {
            res.status(500).json({ message: "Ошибка вступления в группу" });
            console.log(error);
            return;
        }
    }
    static async leaveGroup(req: Request, res: Response) {
        try {
            
        }
        catch (error) {
            res.status(500).json({ message: "Ошибка при выходе из группы" });
            console.log(error);
            return;
        }
    }
    static async deleteGroup(req: Request, res: Response) {
        try {
            
        }
        catch (error) {
            res.status(500).json({ message: "Ошибка удаления группы" });
            console.log(error);
            return;
        }
    }
}

export default GroupsController;