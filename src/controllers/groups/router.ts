import { Router } from 'express';
import GroupsController from './controller';
const router = Router();

router.post('/', GroupsController.createGroup);
router.delete('/', GroupsController.deleteGroup);
router.post('/join', GroupsController.sendJoinRequest);
router.post('/leave', GroupsController.leaveGroup);
router.post('/accept-join-request', GroupsController.acceptJoinRequest);
router.post('/kick-user-from-group', GroupsController.kickOutUserFromGroup);

export default router;