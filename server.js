import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 8080;

// Set content type for .js files
app.use((req, res, next) => {
  if (req.path.endsWith('.js')) {
    res.type('application/javascript');
  }
  next();
});

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, '')));

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
