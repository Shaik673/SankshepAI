const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const documentController = require('../controllers/documentController');
const summaryController = require('../controllers/summaryController');
const { authenticate } = require('../middleware/auth');
const requireVerified = require('../middleware/requireVerified');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'text/markdown',
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(pdf|docx|doc|txt|md)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Please upload a PDF, DOCX, TXT, or Markdown document.'));
    }
  },
});

router.use(authenticate, requireVerified);

router.post('/', documentController.createFromText);
router.post('/upload', upload.single('file'), documentController.upload);
router.post('/batch-upload', upload.array('files', 10), documentController.batchUpload);
router.post('/import-url', documentController.importUrl);
router.get('/', documentController.list);
router.post('/rag/query', documentController.queryCorpus);
router.get('/:id', documentController.get);
router.get('/:id/text', documentController.getExtracted);
router.get('/:id/download', documentController.download);
router.post('/:id/ask', documentController.ask);
router.post('/:id/summarize', (req, res, next) => {
  req.body.documentId = req.params.id;
  return summaryController.generate(req, res, next);
});
router.patch('/:id', documentController.rename);
router.delete('/:id', documentController.delete);
router.post('/batch-delete', documentController.batchDelete);

module.exports = router;
