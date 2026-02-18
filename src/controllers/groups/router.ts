import { Router } from 'express';
import GroupsController from './controller';
const router = Router();

router.post('/', GroupsController.createGroup);
router.delete('/', GroupsController.deleteGroup);
router.post('/join', GroupsController.joinGroup);
router.post('/leave', GroupsController.leaveGroup);

export default router;