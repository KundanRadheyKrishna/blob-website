const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const { requireLogin } = require('../middlewares/authMiddleware');
const postController = require('../controllers/postController');

router.get('/post', requireLogin, postController.getCreatePostPage);
router.post('/posts', requireLogin, upload.single('image'), postController.createPost);

module.exports = router;
