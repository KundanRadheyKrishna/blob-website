require('dotenv').config();
const express = require('express');
const app = express();
const multer = require('multer');
const PostModel = require('./models/post')
const userModel = require('./models/user');
const cookieParser = require('cookie-parser');
const cloudinary = require('./config/cloudinary');

const path = require('path');
const bcrypt = require('bcrypt')
const jwt = require("jsonwebtoken");
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// Form data read karne ke liye
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser())

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is missing');
}

app.use((req, res, next) => {
    try {
        req.id = jwt.verify(
            req.cookies?.token,
            JWT_SECRET
        ).id;
    } catch {
        req.id = null;
    }

    res.locals.isLoggedIn = !!req.id;

    next();
});

function requireLogin(req, res, next) {
    if (!req.id) {
        return res.redirect('/login');
    }

    next();
}

app.get('/', async (req, res) => {
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
});
app.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body

        if (!username?.trim() || !email?.trim() || !password) return res.status(400).send("All fields are required");
        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await userModel.findOne({
            email: normalizedEmail,
        });
        if (existingUser) return res.status(409).send("Email already registered");

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await userModel.create({
            username: username.trim(),
            email: email.trim().toLowerCase(),
            password: hashedPassword,
        });

        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        }).status(201).json({
            message: "User registered successfully",
        });

    } catch (error) {
        console.error("Register error:", error);

        if (error.code === 11000) {
            return res.status(409).json({
                message: "Email already registered",
            });
        }

        return res.status(500).json({
            message: "Internal server error",
        });
    }

})
app.get('/register', (req, res) => {
    res.render("register")
})

app.post('/logout', (req, res) => {
    try {
            res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        })
        return res.redirect('/');

    } catch (error) {
        console.error('Logout error:', error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

app.post('/login', async (req, res) => {
    try {
        // Step 1: Request body se email aur password lo
        const { email, password } = req.body;

        // Step 2: Check karo ki fields mili hain
        if (
            typeof email !== 'string' ||
            typeof password !== 'string' ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Step 3: Email se user ko database mein find karo
        const user = await userModel.findOne({
            email: email.trim().toLowerCase()
        });

        // Step 4: User nahi mila toh login reject karo
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Step 5: Enter kiya password aur stored hash compare karo
        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        // Step 6: Password galat hai toh login reject karo
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Step 7: User ki ID se JWT token banao
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Step 8: Token ko secure cookie mein set karo
        return res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        }).status(200).json({
            success: true,
            message: 'Login successful'
        });

    } catch (error) {
        console.error('Login error:', error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});
app.get('/login', (req,res) => {
    res.render("login")
})



const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,

    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1
    },

    fileFilter: (req, file, cb) => {

        const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/webp'
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPG, PNG and WEBP images are allowed'));
        }
    }
});

function uploadToCloudinary(buffer) {
    return new Promise((resolve, reject) => {

        cloudinary.uploader.upload_stream(
            {
                folder: 'mini-project/posts',
                resource_type: 'image'
            },
            (error, result) => {
                if (error) {
                    return reject(error);
                }

                resolve(result);
            }
        ).end(buffer);

    });
}

app.post('/posts', requireLogin, upload.single('image'), async (req, res) => {

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
            try {
                await cloudinary.uploader.destroy(uploadedImage.public_id);
            } catch (cleanupError) {
                console.error('Image cleanup error:', cleanupError);
            }
        }

        return res.status(500).send('Unable to create post');
    }

});
app.get('/post', requireLogin, (req, res) => {
    res.render('post');
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});