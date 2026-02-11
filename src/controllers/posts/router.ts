import { Router } from 'express';
import PostsController from './controller';
const router = Router();

router.post('/', PostsController.createPost);
router.delete('/', PostsController.deletePost);
router.post('/like', PostsController.likePost);
router.post('/comment', PostsController.addComment);
router.post('/comment/like', PostsController.likeComment);
router.delete('/comment', PostsController.deleteComment);
router.get('/', PostsController.getUserPostsInfo);
router.get('/get-post-by-id', PostsController.getPostById);

export default router;