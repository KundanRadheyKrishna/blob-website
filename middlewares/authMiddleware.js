const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is missing');
}

function attachUser(req, res, next) {
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
}

function requireLogin(req, res, next) {
    if (!req.id) {
        return res.redirect('/login');
    }
    next();
}

module.exports = {
    attachUser,
    requireLogin
};
