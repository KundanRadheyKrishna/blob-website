const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const { requireLogin } = require('../middlewares/authMiddleware');
const postController = require('../controllers/postController');

router.get('/post', requireLogin, postController.getCreatePostPage);
router.post('/posts', requireLogin, upload.none(), postController.createPost);
router.post('/api/upload-image', requireLogin, (req, res, next) => {
    upload.single('image')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        next();
    });
}, postController.uploadImage);

module.exports = router;
