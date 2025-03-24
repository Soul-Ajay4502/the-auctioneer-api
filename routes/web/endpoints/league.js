const express = require("express");
const router = express.Router();
const paginate = require("../../../commonFunctions/paginator");
const authenticateToken = require("../../../middlewares/checkAuth");
const toCamelCase = require("../../../commonFunctions/toCamelCase");
const db = require("../../../config/db");
const sendServerError = require("../../../commonFunctions/sendServerError")

router.get("/", authenticateToken, async (req, res, next) => {
    const page = parseInt(req.query.page) || 1; // Default page is 1 if not provided
    const limit = parseInt(req.query.limit) || 10;

    // Query to fetch leagues created by the logged-in user
    const leagueListQuery = `SELECT 
                                    l.*,
                                    COUNT(DISTINCT pd.player_id) AS player_count,
                                    COUNT(DISTINCT t.team_id) AS team_count
                                FROM 
                                    leagues l
                                LEFT JOIN 
                                    player_details pd ON pd.league_id = l.league_id
                                LEFT JOIN 
                                    teams t ON t.league_id = l.league_id
                                WHERE 
                                    l.created_by = ?
                                GROUP BY 
                                    l.league_id
                                ORDER BY 
                                    l.created_date DESC
                                `;
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

// Create API
router.post("/add", authenticateToken, async (req, res) => {
    const {
        leagueName,
        leagueFullName,
        leagueLocations,
        totalPlayers,
        totalTeams,
        hasUnsold,
        leagueStartDate,
        leagueEndDate,
        registrationFee,
        registrationEndDate,
        playerBasePrice,
        auctionStartDate,
        bidAmountPerTeam,
        increments,
        breakPoints,
        minimumPlayerCount
    } = req.body;

    if (
        !leagueName ||
        !leagueFullName ||
        !leagueLocations ||
        !totalPlayers ||
        !totalTeams ||
        !hasUnsold ||
        !leagueStartDate ||
        !leagueEndDate ||
        !registrationFee ||
        !registrationEndDate ||
        !playerBasePrice ||
        !bidAmountPerTeam ||
        !auctionStartDate ||
        !breakPoints ||
        !increments||
        !minimumPlayerCount
    ) {
        return res.status(400).json({
            statusCode: 400,
            isError: true,
            statusText: "All fields are required",
            responseData: [],
        });
    }

    const query = `
        INSERT IGNORE INTO leagues (
            league_name, league_full_name, league_locations, total_players, total_teams,
            has_unsold, league_start_date, league_end_date, registration_fee, created_by,
            registration_end_date,player_base_price,bid_amount_per_team,auction_start_date,break_points,increments,minimum_player_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? , ? , ? , ? ,? ,?,?)
    `;

    const values = [
        leagueName,
        leagueFullName,
        leagueLocations,
        totalPlayers,
        totalTeams,
        hasUnsold,
        leagueStartDate,
        leagueEndDate,
        registrationFee,
        req.user.user_id,
        registrationEndDate,
        playerBasePrice,
        bidAmountPerTeam,
        auctionStartDate,
        breakPoints,
        increments,
        minimumPlayerCount
    ];

    try {
        [rows, fields] = await db.query(query, values);
        return res
            .status(200)
            .json({
                statusCode: 200,
                isError: false,
                statusText: rows.length + " RECORDS FOUND",
                responseData: rows,
            })
            .end();
    } catch (error) {
        return sendServerError(res, error);
    }
});

router.post("/update", authenticateToken, async (req, res) => {
    const {
        leagueId,
        leagueName,
        leagueFullName,
        leagueLocations,
        totalPlayers,
        totalTeams,
        hasUnsold,
        leagueStartDate,
        leagueEndDate,
        registrationFee,
        registrationEndDate,
        playerBasePrice,
        bidAmountPerTeam,
        auctionStartDate,
        breakPoints,
        increments,
        minimumPlayerCount
    } = req.body;

    // Check for missing fields
    if (
        !leagueName ||
        !leagueFullName ||
        !leagueLocations ||
        !totalPlayers ||
        !totalTeams ||
        !hasUnsold ||
        !leagueStartDate ||
        !leagueEndDate ||
        !registrationFee ||
        !registrationEndDate ||
        !playerBasePrice ||
        !bidAmountPerTeam ||
        !auctionStartDate ||
        !breakPoints ||
        !increments||
        !minimumPlayerCount
    ) {
        return res.status(400).json({
            statusCode: 400,
            isError: true,
            statusText: "All fields are required",
            responseData: [],
        });
    }

    const query = `
        UPDATE leagues SET
            league_name = ?, 
            league_full_name = ?, 
            league_locations = ?, 
            total_players = ?, 
            total_teams = ?, 
            has_unsold = ?, 
            league_start_date = ?, 
            league_end_date = ?, 
            registration_fee = ?, 
            registration_end_date = ?,
            player_base_price=?,
            bid_amount_per_team = ?,
            auction_start_date = ?,
            increments = ?,
            break_points = ?,
            minimum_player_count = ?
        WHERE league_id = ?
    `;

    const values = [
        leagueName,
        leagueFullName,
        leagueLocations,
        totalPlayers,
        totalTeams,
        hasUnsold,
        leagueStartDate,
        leagueEndDate,
        registrationFee,
        registrationEndDate,
        playerBasePrice,
        bidAmountPerTeam,
        auctionStartDate,
        increments,
        breakPoints,
        minimumPlayerCount,
        leagueId,
    ];

    try {
        const [rows, fields] = await db.query(query, values);

        if (rows.affectedRows === 0) {
            return res.status(404).json({
                statusCode: 404,
                isError: true,
                statusText: "No record found to update",
                responseData: [],
            });
        }

        return res.status(200).json({
            statusCode: 200,
            isError: false,
            statusText: "Record updated successfully",
            responseData: rows,
        });
    } catch (error) {
        return sendServerError(res, error);
    }
});

module.exports = router;
