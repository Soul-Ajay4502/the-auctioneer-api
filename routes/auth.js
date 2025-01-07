const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const JWT_KEY = process.env.JWT_SECRET;
const REFRESH_JWT_KEY = process.env.REFRESH_JWT_KEY;
let refreshTokens = [];
const { validationResult } = require("express-validator");
const validator = require("./validations/validation");
const { generateOTP, verifyOTP, encryptPassword } = require("../commonFunctions/authFunctions");

router.get("/", async (req, res, next) => {
    const conn = await db.connection();
    const results = conn.execute("select 1+1");
    conn.release();
    res.status(200).json({
        statusCode: 200,
        isError: false,
        responseData: results,
        statusText: "RECORD OK",
    });
});

// login API
router.post("/login", validator.logincheck, async (req, res, next) => {
    const errors = validationResult(req);
    const { USERNAME, PASSWORD } = req.body;

    let USER;

    if (!errors.isEmpty()) {
        return res.status(400).json({
            statusCode: 400,
            isError: true,
            responseData: errors.array(),
            statusText: errors.errors[0].msg || "please check your credentials",
        });
    } else {
        // login
        const query = `SELECT * FROM user_login WHERE user_name = ? AND is_registration_complete = 'yes'`;
        const records = [USERNAME];
        try {
            let conn;
            try {
                conn = await db.connection();
            } catch (error) {
                return send500Error(res, error);
            }
            await conn.beginTransaction();
            [userRows, userFields] = await conn.query(query, records);
            USER = userRows[0];
            // console.log(USER);
            if (userRows.length > 0) {
                // console.log(USER);
                if (bcrypt.compareSync(PASSWORD, USER.user_password)) {
                    const token = generateAccessToken(USER);
                    const refreshToken = generateRefreshToken(USER);
                    refreshTokens.push(refreshToken);
                    await conn.commit();
                    await conn.release();
                    const userDetail = {
                        userId: USER.user_id,
                        username: USER.user_name,
                        lastLogin: USER.last_login_date,
                        isBanned: USER.is_banned,
                        displayName: USER.display_name,
                    };

                    res.status(201)
                        .json({
                            statusCode: 201,
                            isError: false,
                            token: token,
                            refreshToken: refreshToken,
                            statusText: "Authenticated",
                            responseData: userDetail,
                        })
                        .end();
                } else {
                    await conn.rollback();
                    await conn.release();
                    res.status(400)
                        .json({
                            statusCode: 400,
                            isError: false,
                            responseData: null,
                            statusText: "INVALID USERNAME OR PASSWORD",
                        })
                        .end();
                }
            } else {
                await conn.rollback();
                await conn.release();
                res.status(400)
                    .json({
                        statusCode: 400,
                        isError: false,
                        responseData: null,
                        statusText: "INVALID USERNAME OR PASSWORD",
                    })
                    .end();
            }
        } catch (error) {
            console.log(error);
            res.status(500)
                .json({
                    statusCode: 500,
                    isError: true,
                    responseData: null,
                    statusText: "Server Error,Try Again",
                })
                .end();
        }
    }
});

// generate token using refresh token
router.post("/token", (req, res) => {
    const { refreshToken } = req.body;

    try {
        if (!refreshToken) {
            res.status(403)
                .json({
                    statusCode: 403,
                    isError: false,
                    responseData: null,
                    statusText: "Unauthorized",
                })
                .end();
        } else if (!refreshTokens.includes(refreshToken)) {
            // return res.sendStatus(403);

            res.status(403)
                .json({
                    statusCode: 403,
                    isError: false,
                    responseData: null,
                    statusText: "Forbidden - Refresh Token Not Valid",
                })
                .end();
        } else {
            jwt.verify(refreshToken, REFRESH_JWT_KEY, (err, user) => {
                if (err) {
                    // return res.sendStatus(403);
                    res.status(403)
                        .json({
                            statusCode: 403,
                            isError: false,
                            responseData: null,
                            statusText: err,
                        })
                        .end();
                } else {
                    const token = generateAccessToken(user);
                    const userDetail = {
                        userId: user.user_id,
                        username: user.user_name,
                        lastLogin: user.last_login_date,
                        isBanned: user.is_banned,
                        displayName: user.display_name,
                    };

                    res.status(201)
                        .json({
                            statusCode: 201,
                            isError: false,
                            token: token,
                            refreshToken: refreshToken,
                            statusText: "Authenticated",
                            responseData: userDetail,
                        })
                        .end();
                }
            });
        }
    } catch (error) {
        console.log(error);
        send500Error(res, error);
    }
});

router.post("/logout", (req, res) => {
    const { refreshToken } = req.body;
    try {
        refreshTokens = refreshTokens.filter((token) => token !== refreshToken);

        res.status(200).json({
            statusCode: 200,
            isError: false,
            statusText: "Logout successful",
        });
    } catch (error) {
        console.log(error);
        res.status(500)
            .json({
                statusCode: 500,
                isError: true,
                responseData: null,
                statusText: "Server Error,Try Again",
            })
            .end();
    }
});

router.post("/get-otp-for-signUp", async (req, res) => {
    const { email, password, displayName } = req.body;
    const query = `SELECT * FROM user_login WHERE user_name = ? `;
    const userRecords = [email];
    try {
        [userRows, userFields] = await db.query(query, userRecords);

        const { otp, expiresAt } = generateOTP();

        const hashedPassword = await encryptPassword(password);
        if (userRows.length == 0) {

            const createUserQuery = `INSERT INTO user_login 
             (user_name, user_password, created_date, display_name, otp,otp_expires_at)
             VALUES(?,?,?,?,?,?)`
            const records = [email, hashedPassword, new Date(), displayName, otp, expiresAt]
            const [response] = await db.query(createUserQuery, records);
            return res.status(200).json({
                statusCode: 200,
                isError: false,
                otp: otp,
                statusText: "OTP has been sent to your email",
            });
        }
        const USER_DATA = userRows[0];
        if (USER_DATA.is_registration_complete == 'yes') {
            return res.status(400).json({
                statusCode: 400,
                isError: false,
                otp: otp,
                statusText: "Your Onboarding has already completed please use login",
            });
        }

        const createUserQuery = `UPDATE user_login 
        SET user_password = ? ,display_name = ?,otp = ? ,otp_expires_at = ? WHERE user_name = ?`
        const records = [hashedPassword, displayName, otp, expiresAt, email]
        const [response] = await db.query(createUserQuery, records);

        res.status(200).json({
            statusCode: 200,
            isError: false,
            otp: otp,
            statusText: "OTP has been sent to your email",
        });
    } catch (error) {
        console.log(error);
        res.status(500)
            .json({
                statusCode: 500,
                isError: true,
                responseData: null,
                statusText: "Server Error,Try Again",
            })
            .end();
    }
});

router.post("/get-otp-for-resetPassword", async (req, res) => {
    const { email, password, displayName } = req.body;
    const query = `SELECT * FROM user_login WHERE user_name = ? `;
    const userRecords = [email];
    try {
        [userRows, userFields] = await db.query(query, userRecords);

        const { otp, expiresAt } = generateOTP();

        if (userRows.length == 0) {
            return res.status(400).json({
                statusCode: 400,
                isError: true,
                statusText: "This email is not registered on the system",
            });
        }
        const USER_DATA = userRows[0];
        if (USER_DATA.is_registration_complete == 'no') {
            return res.status(400).json({
                statusCode: 400,
                isError: false,
                otp: otp,
                statusText: "Your Onboarding has not completed please register first",
            });
        }

        const createUserQuery = `UPDATE user_login 
        SET otp = ? ,otp_expires_at = ? WHERE user_name = ?`
        const records = [otp, expiresAt, email]
        await db.query(createUserQuery, records);

        res.status(200).json({
            statusCode: 200,
            isError: false,
            otp: otp,
            statusText: "OTP has been sent to your email",
        });
    } catch (error) {
        console.log(error);
        res.status(500)
            .json({
                statusCode: 500,
                isError: true,
                responseData: null,
                statusText: "Server Error,Try Again",
            })
            .end();
    }
});

router.post("/resetPassword", async (req, res) => {
    const { email, otp, newPassword:password } = req.body;
    const query = `SELECT * FROM user_login WHERE user_name = ? `;
    const userRecords = [email];
    try {
        [userRows, userFields] = await db.query(query, userRecords);
        const hashedPassword = await encryptPassword(password);
        if (userRows.length == 0) {
            return res.status(400).json({
                statusCode: 400,
                isError: false,
                statusText: "USER not found",
            });
        }
        const USER_DATA = userRows[0];
        if (USER_DATA.is_registration_complete == 'no') {
            return res.status(400).json({
                statusCode: 400,
                isError: false,
                statusText: "Your Onboarding has not completed",
            });
        }
        const verificationResult = verifyOTP(otp, USER_DATA.otp, USER_DATA.expiresAt);
        if (!verificationResult.isValid) {
            return res.status(400).json({
                statusCode: 400,
                isError: false,
                statusText: "Invalid Otp",
            });
        }

        const updateUserQuery = `UPDATE user_login 
        SET user_password = ? WHERE user_name = ?`
        const records = [hashedPassword, email]
        const [response] = await db.query(updateUserQuery, records);

        res.status(200).json({
            statusCode: 200,
            isError: false,
            statusText: "Password was updated",
        });
    } catch (error) {
        console.log(error);
        res.status(500)
            .json({
                statusCode: 500,
                isError: true,
                responseData: null,
                statusText: "Server Error,Try Again",
            })
            .end();
    }
});
router.post("/register", async (req, res) => {
    const { email, otp } = req.body;
    const query = `SELECT * FROM user_login WHERE user_name = ? `;
    const userRecords = [email];
    try {
        [userRows, userFields] = await db.query(query, userRecords);
        if (userRows.length == 0) {
            return res.status(400).json({
                statusCode: 400,
                isError: false,
                statusText: "USER not found",
            });
        }
        const USER_DATA = userRows[0];
        if (USER_DATA.is_registration_complete == 'yes') {
            return res.status(400).json({
                statusCode: 400,
                isError: false,
                statusText: "Your Onboarding has already completed please use login",
            });
        }
        const verificationResult = verifyOTP(otp, USER_DATA.otp, USER_DATA.expiresAt);
        if (!verificationResult.isValid) {
            return res.status(400).json({
                statusCode: 400,
                isError: false,
                statusText: "Invalid Otp",
            });
        }

        const updateUserQuery = `UPDATE user_login 
        SET is_registration_complete = ? WHERE user_name = ?`
        const records = ['yes', email]
        const [response] = await db.query(updateUserQuery, records);

        res.status(200).json({
            statusCode: 200,
            isError: false,
            statusText: "OTP has been sent to your email",
        });
    } catch (error) {
        console.log(error);
        res.status(500)
            .json({
                statusCode: 500,
                isError: true,
                responseData: null,
                statusText: "Server Error,Try Again",
            })
            .end();
    }
});


module.exports = router;

// function to generate token
function generateAccessToken(user) {
    // expires after half and hour (1800 seconds = 30 minutes)
    if (!user.exp) {
        return jwt.sign(user, JWT_KEY, {
            expiresIn: "1800s",
        });
    }

    return jwt.sign(user, JWT_KEY);
}

// function to generate refresh token
function generateRefreshToken(user) {
    // expires after 5 hour (18000 seconds = 5 hrs)
    return jwt.sign(user, REFRESH_JWT_KEY, {
        expiresIn: "18000s",
    });
}

function send500Error(res, error) {
    res.status(500)
        .json({
            statusCode: 500,
            isError: true,
            responseData: null,
            statusText: error.message,
        })
        .end();
}
