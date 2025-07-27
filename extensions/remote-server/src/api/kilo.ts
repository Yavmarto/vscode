import { Router } from 'express';

const router = Router();

router.post('/chat', (req, res) => {
    res.send('Kilo chat placeholder');
});

router.post('/approve', (req, res) => {
    res.send('Kilo approve placeholder');
});

export default router;