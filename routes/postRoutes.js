const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const { requireLogin } = require('../middlewares/authMiddleware');
const postController = require('../controllers/postController');

router.get('/post', requireLogin, postController.getCreatePostPage);
router.post('/posts', requireLogin, express.json(), express.urlencoded({ extended: true }), upload.none(), postController.createPost);

router.post('/api/generate-caption',
    requireLogin,
    express.json(),
    express.urlencoded({ extended: true }),
    postController.generateCaption
);

router.post('/api/upload-image', requireLogin, (req, res, next) => {
    upload.single('image')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        next();
    });
}, postController.uploadImage);

router.post('/api/delete-image',
    requireLogin,
    express.json(),
    express.urlencoded({ extended: true }),
    express.text({ type: ['text/*', 'application/json'] }),
    (req, res, next) => {
        upload.none()(req, res, () => {
            next();
        });
    },
    postController.deleteImage
);

module.exports = router;
