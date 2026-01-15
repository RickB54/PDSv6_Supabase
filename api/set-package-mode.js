import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
    if (req.method === 'POST') {
        const { mode } = req.body;
        const filePath = path.join(process.cwd(), 'public', 'package-mode.json');

        fs.writeFileSync(filePath, JSON.stringify({ mode }, null, 2));

        res.status(200).json({ success: true });
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
