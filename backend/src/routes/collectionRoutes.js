const express = require('express');
const router = express.Router();
const collectionController = require('../controllers/collectionController');
const { authenticate } = require('../middleware/auth');
const requireVerified = require('../middleware/requireVerified');

router.use(authenticate, requireVerified);

router.get('/', collectionController.list);
router.post('/', collectionController.create);
router.get('/:id', collectionController.get);
router.put('/:id', collectionController.update);
router.delete('/:id', collectionController.delete);

module.exports = router;
