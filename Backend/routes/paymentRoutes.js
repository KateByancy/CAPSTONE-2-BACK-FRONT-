const router = require('express').Router();
const auth = require('../middeware/auth');
const { authorizeRoles } = auth;
const controller = require('../controllers/gcashController');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } }).single('proof');
router.use(auth, authorizeRoles('admin', 'client'));
router.get('/', controller.list);
router.get('/settings', controller.getSettings);
router.put('/settings', authorizeRoles('admin'), controller.saveSettings);
router.post('/', authorizeRoles('admin'), controller.create);
router.post('/:id/checkout', authorizeRoles('client'), controller.checkout);
router.post('/:id/proof', authorizeRoles('client'), (req, res) => {
    upload(req, res, error => {
        if (error) return res.status(400).json({ message: 'Upload one receipt image no larger than 5 MB.' });
        return controller.submit(req, res);
    });
});
router.get('/:id/proof', controller.proof);
router.put('/:id/review', authorizeRoles('admin'), controller.review);
router.put('/:id/cancel', authorizeRoles('admin'), controller.cancel);
module.exports = router;
