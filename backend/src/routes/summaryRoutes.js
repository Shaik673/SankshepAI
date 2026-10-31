const express = require('express');
const router = express.Router();
const summaryController = require('../controllers/summaryController');
const { authenticate } = require('../middleware/auth');
const requireVerified = require('../middleware/requireVerified');

router.use(authenticate, requireVerified);

router.post('/generate', summaryController.generate);
router.post('/compare', summaryController.compare);
router.get('/', summaryController.list);
router.get('/:id', summaryController.get);
router.put('/:id', summaryController.update);
router.delete('/:id', summaryController.delete);
router.get('/:id/versions', summaryController.getVersions);
router.patch('/:id', summaryController.rename);
router.post('/:id/collection', summaryController.addToCollection);
router.get('/:id/export', summaryController.export);

module.exports = router;
