const jwt = require("jsonwebtoken");
const JWT_KEY = "secret";

module.exports = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
        res.status(403)
            .json({
                statusCode: 403,
                isError: true,
                responseData: null,
                statusText: "TOKEN MISSING IN HEADERS",
            })
            .end();
    }
    const token = authHeader.split(" ")[1];
    try {
        const user = jwt.verify(token, JWT_KEY);
        req.user = user;
        next();
    } catch (error) {
        res.status(401)
            .json({
                statusCode: 401,
                isError: true,
                responseData: null,
                statusText: "INVALID TOKEN",
            })
            .end();
    }
};
