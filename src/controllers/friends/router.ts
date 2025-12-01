import { Router } from 'express';
import FriendsController from './controller';
const router = Router();

router.post('/send-friend-request', FriendsController.sendFriendRequest);
router.post('/delete-friend-request', FriendsController.deleteFriendRequest);
router.delete('/', FriendsController.deleteFriend);
router.post('/accept-friend-request', FriendsController.acceptFriendRequest);
router.get('/', FriendsController.getFriendsList);

export default router;