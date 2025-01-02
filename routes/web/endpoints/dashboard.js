const express = require("express");
const router = express.Router();
const paginate = require("../../../commonFunctions/paginator");
const authenticateToken = require("../../../middlewares/checkAuth");
const toCamelCase = require("../../../commonFunctions/toCamelCase");
const db = require("../../../config/db");
const sendServerError=require("../../../commonFunctions/sendServerError")

router.get("/", authenticateToken, async (req, res, next) => {
    const requestedUser = req.user.user_id;

    // Queries
    const leagueListQuery = `SELECT COUNT(*) AS total_league_count 
                             FROM leagues 
                             WHERE created_by = ?`;

    const totalPlayerQuery = `SELECT COUNT(DISTINCT player_name, place, whatsapp_no) AS total_player_count
                              FROM player_details 
                              WHERE league_id IN (SELECT league_id FROM leagues WHERE created_by = ?)`;

    const totalTeamsQuery = `SELECT COUNT(DISTINCT team_name, team_owner, team_owner_phone) AS total_team_count
                             FROM teams 
                             WHERE league_id IN (SELECT league_id FROM leagues WHERE created_by = ?)`;
    const totalAmount=`SELECT 
                        SUM( (CAST(total_players AS UNSIGNED) * CAST(registration_fee AS DECIMAL(10, 2)))) AS total_amount
                        FROM 
                            leagues
                        WHERE created_by = ?`

    try {
        // Execute queries in parallel
        const [[leagueCount], [playerCount], [teamCount],[totalAmt]] = await Promise.all([
            db.query(leagueListQuery, [requestedUser]),
            db.query(totalPlayerQuery, [requestedUser]),
            db.query(totalTeamsQuery, [requestedUser]),
            db.query(totalAmount, [requestedUser])
        ]);

        // Format the response data
        const formattedResponseData = toCamelCase({
            totalLeagueCount: leagueCount[0].total_league_count,
            totalPlayerCount: playerCount[0].total_player_count,
            totalTeamCount: teamCount[0].total_team_count,
            totalAmount:totalAmt[0].total_amount
        });

        // Send response
        res.status(200).json({
            statusCode: 200,
            isError: false,
            responseData: formattedResponseData,
            statusText: "Items retrieved successfully",
        });
    } catch (error) {
        // Send error response with additional context
        return sendServerError(res, error);
    }
});


router.get("/topValuePlayers", authenticateToken, async (req, res, next) => {
    const requestedUser = req.user.user_id;

    // Queries
    const leagueListQuery = `SELECT *
                              FROM player_league_team_view 
                              WHERE  created_by = ? ORDER BY CAST(sold_amount AS DECIMAL) DESC
                              LIMIT 3`;
    try {
        const [response] = 
            await db.query(leagueListQuery,requestedUser)

        // Format the response data
        const formattedResponseData = toCamelCase(response);

        // Send response
        res.status(200).json({
            statusCode: 200,
            isError: false,
            responseData: formattedResponseData,
            statusText: "Items retrieved successfully",
        });
    } catch (error) {
        // Send error response with additional context
        return sendServerError(res, error);
    }
});

router.get("/leagues", authenticateToken, async (req, res, next) => {
    const page = parseInt(req.query.page) || 1; // Default page is 1 if not provided
    const limit = parseInt(req.query.limit) || 4;

    // Query to fetch leagues created by the logged-in user
    const leagueListQuery = `SELECT * FROM leagues WHERE created_by = ? ORDER BY created_date DESC`;
    const params = [req.user.user_id];

    try {
        const results = await paginate(
            leagueListQuery,
            params,
            page, // Already parsed as integer
            limit // Already parsed as integer
        );
        const formattedResponseData = toCamelCase(results.data);
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
