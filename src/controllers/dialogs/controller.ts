import { Request, Response } from 'express';
import userHelpers from '../../helpers/user-helpers';
import Dialogs from '../../models/dialogs/dialogs';

class DialogsController {
    static async getUserDialogs(req: Request, res: Response) {
        try {
            const user = await userHelpers.getUserFromToken(req);
            const dialogs = await Dialogs.aggregate([
                {
                    $match: {
                        "members": user?._id.toString()
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
                }
            ]);

            res.status(200).json({ message: "Информация о диалогах успешно получена", dialogs });
        }
        catch (error) {
            res.status(400).json({ message: "Ошибка получения информации о диалогах" });
            console.log(error);
        }
    }
}

export default DialogsController;