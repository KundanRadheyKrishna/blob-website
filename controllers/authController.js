const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userModel = require('../models/user');

const JWT_SECRET = process.env.JWT_SECRET;

const getRegisterPage = (req, res) => {
    res.render('register');
};

const registerUser = async (req, res) => {
    try {
        const { username, email, password } = req.body;

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
            JWT_SECRET,
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
};

const getLoginPage = (req, res) => {
    res.render('login');
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

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

        const user = await userModel.findOne({
            email: email.trim().toLowerCase()
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const token = jwt.sign(
            { id: user._id },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        }).redirect('/');

    } catch (error) {
        console.error('Login error:', error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const logoutUser = (req, res) => {
    try {
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        });
        return res.redirect('/');
    } catch (error) {
        console.error('Logout error:', error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    getRegisterPage,
    registerUser,
    getLoginPage,
    loginUser,
    logoutUser
};
