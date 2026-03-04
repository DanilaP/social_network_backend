import { Router } from 'express';
import DialogsController from './controller';
const router = Router();

router.get('/', DialogsController.getUserDialogs);
router.delete('/', DialogsController.deleteDialog);
router.post('/message/send', DialogsController.sendMessage);
router.post('/message/edit', DialogsController.changeMessage);
router.delete('/message/delete', DialogsController.deleteMessage);

export default router;