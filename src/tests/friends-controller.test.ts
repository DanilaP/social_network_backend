import { Request, Response } from 'express';
import FriendsController from '../controllers/friends/controller';
import userHelpers from '../helpers/user-helpers';
import User from '../models/user/user';

jest.mock('../models/user/user');
jest.mock('../helpers/user-helpers');

const mockResponse = () => {
    const res = {} as Response;
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.cookie = jest.fn().mockReturnValue(res);
    return res;
};

describe('Тестирование метода /friends/send-friend-request', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    const req = {
        body: {
            id: 'test__user__id'
        },
    } as Request;

    it('Метод возвращает 400 статус код и сообщение о том, что заявка в друзья выбранному пользователю уже отправлена', async () => {
        const res = mockResponse();

        (userHelpers.getUserFromToken as jest.Mock).mockResolvedValueOnce({
            _id: "id",
            name: "name", 
            sendedFriendRequests: ["test__user__id"] 
        });

        await FriendsController.sendFriendRequest(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: "Вы уже отправили заявку в друзья данному человеку",
        }));
    })

    it('Метод возвращает 400 статус код и сообщение о том, что выбранный пользователь не найден', async () => {
        const res = mockResponse();

        (userHelpers.getUserFromToken as jest.Mock).mockResolvedValueOnce({
            _id: "id",
            name: "name", 
            sendedFriendRequests: ["test__friend__request__id"] 
        });
        (User.bulkWrite as jest.Mock).mockResolvedValueOnce({ matchedCount: 0 });

        await FriendsController.sendFriendRequest(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: "Пользователь не найден",
        }));
    })

    it('Метод возвращает 200 статус код и сообщение о том, что заявка в друзья успешно отправлена', async () => {
        const res = mockResponse();

        (userHelpers.getUserFromToken as jest.Mock).mockResolvedValueOnce({
            _id: "id",
            name: "name", 
            sendedFriendRequests: ["test__friend__request__id"] 
        });
        (User.bulkWrite as jest.Mock).mockResolvedValueOnce({ matchedCount: 2 });

        await FriendsController.sendFriendRequest(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: "Заявка в друзья успешно отправлена",
        }));
    })
})

describe('Тестирование метода /friends/delete-friend-request', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    const req = {
        body: {
            id: 'test__user__id'
        },
    } as Request;

    it('Метод возвращает 400 статус код и сообщение о том, что пользователь с указанным id не найден', async () => {
        const res = mockResponse();

        (userHelpers.getUserFromToken as jest.Mock).mockResolvedValueOnce({
            _id: "id",
            name: "name", 
            sendedFriendRequests: ["test__user__id"] 
        });
        (User.bulkWrite as jest.Mock).mockResolvedValueOnce({ matchedCount: 0 });

        await FriendsController.deleteFriendRequest(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: "Пользователь не найден",
        }));
    })

    it('Метод возвращает 400 статус код и сообщение о том, что данной заявки в друзья не существует', async () => {
        const res = mockResponse();

        (userHelpers.getUserFromToken as jest.Mock).mockResolvedValueOnce({
            _id: "id",
            name: "name", 
            sendedFriendRequests: ["test__user__id"] 
        });
        (User.bulkWrite as jest.Mock).mockResolvedValueOnce({ modifiedCount: 0 });

        await FriendsController.deleteFriendRequest(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: "Данной заявки в друзья нету в списке отправленных вами заявок",
        }));
    })

    it('Метод возвращает 200 статус код и сообщение о том, что заявка в друзья успешно удалена', async () => {
        const res = mockResponse();

        (userHelpers.getUserFromToken as jest.Mock).mockResolvedValueOnce({
            _id: "id",
            name: "name", 
            sendedFriendRequests: ["test__user__id"] 
        });
        (User.bulkWrite as jest.Mock).mockResolvedValueOnce({ modifiedCount: 2 });

        await FriendsController.deleteFriendRequest(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: "Заявка в друзья успешно удалена",
        }));
    })
})

describe('Тестирование метода /friends/accept-friend-request', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    const req = {
        body: {
            id: 'test__user__id'
        },
    } as Request;

    it('Метод возвращает 400 статус код и сообщение о том, что данная заявка в друзья не найдена', async () => {
        const res = mockResponse();

        (userHelpers.getUserFromToken as jest.Mock).mockResolvedValueOnce({
            _id: "id",
            name: "name", 
            friendRequests: ["test__user__id__not__equal"] 
        });

        await FriendsController.acceptFriendRequest(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: "У вас нет заявки в друзья от данного человека",
        }));
    })

    it('Метод возвращает 400 статус код и сообщение о том, что один или оба пользователя не найдены', async () => {
        const res = mockResponse();

        (userHelpers.getUserFromToken as jest.Mock).mockResolvedValueOnce({
            _id: "id",
            name: "name", 
            friendRequests: ["test__user__id"] 
        });

        (User.bulkWrite as jest.Mock).mockResolvedValueOnce({ matchedCount: 1 });

        await FriendsController.acceptFriendRequest(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: "Один или оба пользователя не найдены",
        }));
    })

    it('Метод возвращает 200 статус код и сообщение о том, что друг успешно добавлен', async () => {
        const res = mockResponse();

        (userHelpers.getUserFromToken as jest.Mock).mockResolvedValueOnce({
            _id: "id",
            name: "name", 
            friendRequests: ["test__user__id"] 
        });

        (User.bulkWrite as jest.Mock).mockResolvedValueOnce({ modifiedCount: 2 });

        await FriendsController.acceptFriendRequest(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: "Успешное добавление друга",
        }));
    })
})

describe('Тестирование метода delete /friends', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    const req = {
        query: {
            id: 'test__user__id'
        },
    } as unknown as Request;

    it('Метод возвращает 400 статус код и сообщение о том, что один или оба пользователя не найдены', async () => {
        const res = mockResponse();

        (userHelpers.getUserFromToken as jest.Mock).mockResolvedValueOnce({ _id: "id" });
        (User.bulkWrite as jest.Mock).mockResolvedValueOnce({ matchedCount: 1 });

        await FriendsController.deleteFriend(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: "Один или оба пользователя не найдены",
        }));
    })

    it('Метод возвращает 400 статус код и сообщение о том, что друг успешно удален', async () => {
        const res = mockResponse();

        (userHelpers.getUserFromToken as jest.Mock).mockResolvedValueOnce({ _id: "id" });
        (User.bulkWrite as jest.Mock).mockResolvedValueOnce({ modifiedCount: 2 });

        await FriendsController.deleteFriend(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: "Успешное удаление друга",
        }));
    })
})