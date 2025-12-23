import { Router } from 'express';
import PostsController from './controller';
const router = Router();

router.post('/', PostsController.createPost);
router.delete('/', PostsController.deletePost);
router.post('/like', PostsController.likePost);
router.post('/comment', PostsController.addComment);
router.delete('/comment', PostsController.deleteComment);
router.get('/', PostsController.getUserPostsInfo);

export default router;