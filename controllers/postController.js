const sharp = require('sharp');
const { GoogleGenAI } = require('@google/genai');
const PostModel = require('../models/post');
const { uploadToCloudinary, destroyCloudinaryImage } = require('../services/cloudinaryService');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const generateCaptionWithFallback = async (imageBuffer) => {
    const models = ['gemini-3.8-flash', 'gemini-3.5-flash-lite'];
    const prompt = 'Generate 1 short, catchy social media caption (max 15-20 words, plain text, no hashtag spam).';
    const inlineData = {
        data: imageBuffer.toString('base64'),
        mimeType: 'image/webp'
    };

    for (const model of models) {
        try {
            const response = await ai.models.generateContent({
                model,
                contents: [
                    { inlineData },
                    prompt
                ],
                config: {
                    maxOutputTokens: 45,
                    thinkingConfig: {
                        thinkingBudget: 0
                    }
                }
            });
            const text = response?.text?.trim();
            if (text) {
                return text;
            }
        } catch (err) {
            console.warn(`Gemini model ${model} failed, attempting next fallback:`, err.message || err);
        }
    }
    return "";
};

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

        const shouldAutoCaption = req.body && req.body.autoCaption === 'true';

        let uploadResult;
        let caption = "";

        if (shouldAutoCaption) {
            const geminiBufferPromise = sharp(req.file.buffer)
                .rotate()
                .resize({ width: 384, withoutEnlargement: true })
                .webp({ quality: 65 })
                .toBuffer();

            const [cloudinaryRes, captionRes] = await Promise.all([
                uploadToCloudinary(compressedBuffer),
                geminiBufferPromise.then(buf => generateCaptionWithFallback(buf)).catch(err => {
                    console.error('Gemini auto-caption error in uploadImage:', err);
                    return "";
                })
            ]);

            uploadResult = cloudinaryRes;
            caption = captionRes || "";
        } else {
            uploadResult = await uploadToCloudinary(compressedBuffer);
        }

        return res.status(200).json({
            imageUrl: uploadResult.secure_url || uploadResult.url,
            publicId: uploadResult.public_id,
            caption
        });
    } catch (error) {
        console.error('Image upload error:', error);
        return res.status(500).json({ error: 'Failed to process and upload image' });
    }
};

const generateCaption = async (req, res) => {
    try {
        const imageUrl = req.body?.imageUrl;
        if (!imageUrl || typeof imageUrl !== 'string') {
            return res.status(400).json({ error: 'Image URL is required' });
        }

        const imgResponse = await fetch(imageUrl);
        if (!imgResponse.ok) {
            return res.status(400).json({ error: 'Unable to fetch image from URL' });
        }

        const arrayBuf = await imgResponse.arrayBuffer();
        const geminiBuffer = await sharp(Buffer.from(arrayBuf))
            .rotate()
            .resize({ width: 384, withoutEnlargement: true })
            .webp({ quality: 65 })
            .toBuffer();

        const caption = await generateCaptionWithFallback(geminiBuffer);
        return res.status(200).json({ caption });
    } catch (error) {
        console.error('Generate caption error:', error);
        return res.status(200).json({ caption: '' });
    }
};

const deleteImage = async (req, res) => {
    try {
        let publicId = req.body?.publicId || req.query?.publicId;
        if (!publicId && typeof req.body === 'string') {
            try {
                const parsed = JSON.parse(req.body);
                publicId = parsed.publicId;
            } catch (e) {}
        }

        if (!publicId || typeof publicId !== 'string') {
            return res.status(400).json({ error: 'Invalid publicId' });
        }

        await destroyCloudinaryImage(publicId);

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Delete image error:', error);
        return res.status(500).json({ error: 'Failed to delete image' });
    }
};

const createPost = async (req, res) => {
    const isJson = Boolean(req.headers.accept?.includes('application/json') || req.is('application/json'));
    try {
        const content = req.body.content;

        // Validate post content
        if (
            typeof content !== 'string' ||
            !content.trim() ||
            content.trim().length > 2000
        ) {
            if (isJson) {
                return res.status(400).json({ error: 'Invalid post content' });
            }
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

        if (isJson) {
            return res.status(200).json({ redirectUrl: '/' });
        }
        return res.redirect(303, '/');

    } catch (error) {
        console.error('Post creation error:', error);
        if (isJson) {
            return res.status(500).json({ error: 'Unable to create post' });
        }
        return res.status(500).send('Unable to create post');
    }
};

module.exports = {
    getFeed,
    getCreatePostPage,
    uploadImage,
    generateCaption,
    deleteImage,
    createPost,
    destroyCloudinaryImage
};
