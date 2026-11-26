const sharp = require('sharp');
const PostModel = require('../models/post');
const { uploadToCloudinary, destroyCloudinaryImage } = require('../services/cloudinaryService');

const getFeed = async (req, res) => {
    try {
        const posts = await PostModel.find()
            .sort({ date: -1 })
            .populate('username', 'username')
            .limit(50)
            .lean();

        res.render('home', {
            posts,
            currentUserId: req.id ? String(req.id) : null
        });

    } catch (error) {
        console.error('Feed error:', error);
        res.status(500).send('Unable to load posts');
    }
};

const getCreatePostPage = (req, res) => {
    res.render('post');
};

const uploadImage = async (req, res) => {
    try {
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        const compressedBuffer = await sharp(req.file.buffer)
            .rotate()
            .resize({ width: 1200, withoutEnlargement: true })
            .webp({ quality: 82 })
            .toBuffer();

        const uploadResult = await uploadToCloudinary(compressedBuffer);

        return res.status(200).json({
            imageUrl: uploadResult.secure_url || uploadResult.url,
            publicId: uploadResult.public_id
        });
    } catch (error) {
        console.error('Image upload error:', error);
        return res.status(500).json({ error: 'Failed to process and upload image' });
    }
};

const createPost = async (req, res) => {
    try {
        const content = req.body.content;

        // Validate post content
        if (
            typeof content !== 'string' ||
            !content.trim() ||
            content.trim().length > 2000
        ) {
            return res.status(400).send('Invalid post content');
        }

        const imageUrl = req.body.imageUrl || null;
        const publicId = req.body.publicId || null;

        // Save post details in MongoDB
        await PostModel.create({
            content: content.trim(),
            username: [req.id],
            imageUrl: imageUrl || null,
            publicId: publicId || null
        });

        return res.redirect(303, '/');

    } catch (error) {
        console.error('Post creation error:', error);
        return res.status(500).send('Unable to create post');
    }
};

module.exports = {
    getFeed,
    getCreatePostPage,
    createPost,
    uploadImage
};
