const { body, validationResult } = require('express-validator');

const validateUser = [
    body('email').notEmpty().isEmail().withMessage("Invalid email address"),
    body('fname').notEmpty().withMessage("First name cannot be empty"),
    body('lname').notEmpty().withMessage("Last name cannot be empty"),
    body('password').notEmpty().isLength({ min: 8 }).withMessage("Password has to be more than 8 characters"),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() })
        }
        next();
    }
]

module.exports = validateUser;