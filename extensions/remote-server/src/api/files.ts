import { Router } from 'express';
import { getFileContent, listFiles } from '../services/workspace';

const router = Router();

router.get('/', async (req, res) => {
    const path = req.query.path;
    if (typeof path !== 'string') {
        return res.status(400).send('Path query parameter is required.');
    }

    try {
        const files = await listFiles(path);
        res.json(files);
    } catch (error) {
        res.status(500).send('Error listing files.');
    }
});

router.get('/content', async (req, res) => {
    const path = req.query.path;
    if (typeof path !== 'string') {
        return res.status(400).send('Path query parameter is required.');
    }

    try {
        const content = await getFileContent(path);
        if (content === null) {
            return res.status(404).send('File not found.');
        }
        res.send(content);
    } catch (error) {
        res.status(500).send('Error getting file content.');
    }
});

export default router;