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

const createPost = async (req, res) => {
    let uploadedImage = null;

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

        let imageUrl = null;
        let publicId = null;

        // Check whether user selected an image
        if (req.file) {
            const { fileTypeFromBuffer } = await import('file-type');

            const fileType = await fileTypeFromBuffer(req.file.buffer);

            const allowedTypes = [
                'image/jpeg',
                'image/png',
                'image/webp'
            ];

            if (!fileType || !allowedTypes.includes(fileType.mime)) {
                return res.status(400).send('Invalid image file');
            }

            // Upload image to Cloudinary
            uploadedImage = await uploadToCloudinary(req.file.buffer);

            imageUrl = uploadedImage.secure_url;
            publicId = uploadedImage.public_id;
        }

        // Save post details in MongoDB
        await PostModel.create({
            content: content.trim(),
            username: [req.id],
            imageUrl: imageUrl,
            publicId: publicId
        });

        return res.redirect(303, '/');

    } catch (error) {
        console.error('Post creation error:', error);

        // Delete Cloudinary image if MongoDB saving fails
        if (uploadedImage?.public_id) {
            await destroyCloudinaryImage(uploadedImage.public_id);
        }

        return res.status(500).send('Unable to create post');
    }
};

module.exports = {
    getFeed,
    getCreatePostPage,
    createPost
};
