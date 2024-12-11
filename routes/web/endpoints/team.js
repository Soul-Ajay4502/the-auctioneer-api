const express = require("express");
const router = express.Router();
const paginate = require("../../../commonFunctions/paginator");
const authenticateToken = require("../../../middlewares/checkAuth");
const toCamelCase = require("../../../commonFunctions/toCamelCase");
const db = require("../../../config/db");
const sendServerError=require("../../../commonFunctions/sendServerError")

router.get("/:leagueId", authenticateToken, async (req, res, next) => {
    const page = parseInt(req.query.page) || 1; // Default page is 1 if not provided
    const limit = parseInt(req.query.limit) || 10;
    const leagueId=req.params.leagueId;

    // Query to fetch leagues created by the logged-in user
    const leagueListQuery = `SELECT * FROM teams WHERE league_id = ? ORDER BY created_date DESC`;
    const params = [leagueId];

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

router.post("/add", authenticateToken, async (req, res) => {
    const {
        teamName,
        teamOwner,
        teamOwnerPhone,
        leagueId,
        jerseyColor,
        teamLogo,
    } = req.body;

    // Validate input fields
    if (
        !teamName ||
        !leagueId
    ) {
        return res.status(400).json({
            statusCode: 400,
            isError: true,
            statusText: "Team name and league ID are required",
            responseData: [],
        });
    }

    const query = `
        INSERT INTO teams (
            team_name, team_owner, team_owner_phone, league_id, jersey_color, team_logo
        ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    const values = [
        teamName,
        teamOwner || null, // Optional field
        teamOwnerPhone || null, // Optional field
        leagueId,
        jerseyColor || null, // Optional field
        teamLogo || null, // Optional field
    ];

    try {
        [rows, fields] = await db.query(query, values);
        return res.status(200).json({
            statusCode: 200,
            isError: false,
            statusText: "Team added successfully",
            responseData: rows,
        }).end();
    } catch (error) {
        return sendServerError(res, error);
    }
});


router.post("/update", authenticateToken, async (req, res) => {
    const {
        teamName,
        teamOwner,
        teamOwnerPhone,
        jerseyColor,
        teamLogo,
        teamId
    } = req.body;

    // Validate input fields (team name is mandatory)
    if (!teamName) {
        return res.status(400).json({
            statusCode: 400,
            isError: true,
            statusText: "Team name is required",
            responseData: [],
        });
    }

    const query = `
        UPDATE teams 
        SET team_name = ?, 
            team_owner = ?, 
            team_owner_phone = ?, 
            jersey_color = ?, 
            team_logo = ?
        WHERE team_id = ?
    `;

    const values = [
        teamName,
        teamOwner || null, 
        teamOwnerPhone || null,
        jerseyColor || null,
        teamLogo || null,
        teamId
    ];

    try {
        const [rows, fields] = await db.query(query, values);

        // Check if any rows were affected
        if (rows.affectedRows === 0) {
            return res.status(404).json({
                statusCode: 404,
                isError: true,
                statusText: "Team not found",
                responseData: [],
            });
        }

        return res.status(200).json({
            statusCode: 200,
            isError: false,
            statusText: "Team updated successfully",
            responseData: rows,
        });
    } catch (error) {
        return sendServerError(res, error);
    }
});

module.exports = router;