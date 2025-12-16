import { Request, Response } from 'express';
import jwt, { JwtPayload } from "jsonwebtoken";
import userHelpers from '../../helpers/user-helpers';
import fsHelpers from '../../helpers/fs-helpers';
import Post from '../../models/post/post';
import User from '../../models/user/user';
import moment from 'moment';
moment.locale('ru');

class PostsController {
    static async createPost(req: Request, res: Response) {
        try {
            const user = await userHelpers.getUserFromToken(req);
            const post = new Post({ 
                user_id: user?._id,
                text: req.body.text,
                files: req.files ? (await fsHelpers.uploadFiles(req.files)).filelist : [],
                date: moment().format('DD MMMM YYYY HH:mm')
            });
            await post.save();
            await User.updateOne({ _id: user?._id }, { $push: { posts: post._id } });
            res.status(200).json({ message: "Успешное создание поста", post: post });
        }
        catch (error) {
            res.status(400).json({ message: "Ошибка при создании поста" });
            console.log(error);
        }
    }
    static async deletePost(req: Request, res: Response) {
        try {
            const post = await Post.findOne({ _id: req.query.id });
            await Post.deleteOne({ _id: req.query.id });

            const postFilesURLs = post?.files.map(file => {
                return file.url.replace(process.env.HOST_URL, `./static`);
            }) as string[];

            const result = await fsHelpers.removeFiles(postFilesURLs);

            if (result.status === 200) {
                res.status(200).json({ message: "Успешное удаление поста" });
            }
            else {
                res.status(400).json({ message: "Ошибка при удалении файлов. Возможна потеря данных", post: post });
            }
        }
        catch (error) {
            res.status(400).json({ message: "Ошибка при удалении поста" });
            console.log(error);
        }
    }
    static async likePost(req: Request, res: Response) {
        try {
            const userId = (jwt.decode(req.cookies?.token) as JwtPayload).id.toString();
            const post = await Post.findOne({ _id: req.body.id }); 
            if (post) {
                const updatedPost = await Post.findOneAndUpdate(
                    { _id: req.body.id }, 
                    [ 
                        {
                            $set: {
                                likes: {
                                    $cond: [
                                        { $in: [userId, "$likes"] },
                                        { $filter: { input: "$likes", cond: { $ne: ["$$this", userId] } } },
                                        { $concatArrays: ["$likes", [userId]] }
                                    ]
                                }
                            }
                        }
                    ],
                    {
                        returnDocument: "after"
                    }
                );
                res.status(200).json({ 
                    message: "Информация о лайке изменена",
                    likesNumber: updatedPost!.likes.length,
                    isPostLikedByUser: updatedPost!.likes.includes(userId) 
                });
            }
            else {
                res.status(400).json({ message: "Пост не найден" });
            }
        }
        catch (error) {
            res.status(400).json({ message: "Ошибка при изменении информации о посте" });
            console.log(error);
        }
    }
    static async addComment(req: Request, res: Response) {
        try {
            const userId = (jwt.decode(req.cookies?.token) as JwtPayload).id.toString();
            const post = await Post.findOne({ _id: req.body.postId }); 
            const commentText = req.body.text;

            if (post) {
                const updatedComments = [
                    ...post.comments,
                    {   
                        user_id: userId,
                        text: commentText,
                        files: req.files ? (await fsHelpers.uploadFiles(req.files)).filelist : [],
                        likes: []
                    }
                ];
                await Post.updateOne({ _id: req.body.postId }, { $set: { comments: updatedComments } });
                res.status(200).json({ message: "Комментарий успешно добавлен" });
            }
            else {
                res.status(400).json({ message: "Пост не найден" });
            }
        }
        catch (error) {
            res.status(400).json({ message: "Ошибка при изменении информации о посте" });
            console.log(error);
        }
    }
    static async deleteComment(req: Request, res: Response) {
        try {
            const userId = (jwt.decode(req.cookies?.token) as JwtPayload).id.toString(); 
            await Post.updateOne(
                { 
                    _id: req.query.postId,
                    "comments._id": req.query.commentId,
                    "comments.user_id": userId
                },
                { 
                    $pull: { 
                        comments: { 
                            _id: req.query.commentId,
                            user_id: userId
                        } 
                    } 
                }
            );
            res.status(200).json({ message: "Комментарий успешно удален" });
        }
        catch (error) {
            res.status(400).json({ message: "Ошибка при удалении комментария" });
            console.log(error);
        }
    }
    static async getUserPostsInfo(req: Request, res: Response) {
        try {
            const userId = req.query.id as string;
            if (userId) {
                const postsInfo = await Post.find({ user_id: userId });
                const modifiedPostInfo = postsInfo.map(post => {
                    let postCopy = post.toObject() as any;
                    postCopy.isPostLikedByUser = post.likes.includes(userId);
                    return postCopy;
                })
                res.status(200).json({ message: "Успешное получение информации о постах", posts: modifiedPostInfo });
                return;
            }
            else {
                res.status(400).json({ message: "Пользователь не найден", posts: [] });
                return;
            }
        }
        catch (error) {
            res.status(400).json({ message: "Ошибка при получении информации о постах" });
            console.log(error);
        }
    }
}

export default PostsController;