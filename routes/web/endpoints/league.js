const express = require("express");
const router = express.Router();
const paginate = require('../../../commonFunctions/paginator');
const authenticateToken = require('../../../middlewares/checkAuth');
const toCamelCase = require("../../../commonFunctions/toCamelCase");


router.get('/', authenticateToken, async (req, res, next) => {
    const page = parseInt(req.query.page) || 1; // Default page is 1 if not provided
    const limit = parseInt(req.query.limit) || 10;

    // Query to fetch leagues created by the logged-in user
    const leagueListQuery = `SELECT * FROM leagues WHERE created_by = ?`;
    const params = [req.user.user_id];

    try {
        const results = await paginate(
            leagueListQuery,
            params,
            page, // Already parsed as integer
            limit // Already parsed as integer
        );
        const formattedResponseData = toCamelCase(results.data)
        // Sending a structured response
        res.status(200).json({
            statusCode: 200,
            isError: false,
            responseData: {
                data: formattedResponseData, // Corrected key name
                pagination: results.pagination,
            },
            statusText: "Items retrieved successfully",
        });
    } catch (error) {
        return sendServerError(res, error); // Forwarding error to a helper function
    }
});

module.exports = router;