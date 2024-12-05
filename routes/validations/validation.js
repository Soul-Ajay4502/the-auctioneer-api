const { check } = require("express-validator");

exports.logincheck = [
    check("USERNAME").notEmpty().withMessage("Username can not be blank"),
    check("PASSWORD")
        .notEmpty()
        .isLength({
            min: 6,
        })
        .withMessage("Please check your credentials"),
];

exports.paginator = [
    check("page").notEmpty().withMessage("page number is missing"),
];
