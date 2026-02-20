import { Router } from 'express';
import GroupsController from './controller';
const router = Router();

router.post('/', GroupsController.createGroup);
router.delete('/', GroupsController.deleteGroup);
router.post('/join', GroupsController.sendJoinRequest);
router.post('/leave', GroupsController.leaveGroup);
router.post('/accept-join-request', GroupsController.acceptJoinRequest);
router.post('/kick-user-from-group', GroupsController.kickOutUserFromGroup);
router.post('/create-post', GroupsController.createPost);
router.post('/delete-post', GroupsController.deletePost);
router.post('/like-post', GroupsController.likePost);
router.post('/post/comment', GroupsController.addCommentToPost);

export default router;