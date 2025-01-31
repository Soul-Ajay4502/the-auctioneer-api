const express = require("express");
const router = express.Router();
const paginate = require("../../../commonFunctions/paginator");
const authenticateToken = require("../../../middlewares/checkAuth");
const toCamelCase = require("../../../commonFunctions/toCamelCase");
const db = require("../../../config/db");
const sendServerError = require("../../../commonFunctions/sendServerError")
const { v2: cloudinary } = require("cloudinary");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
require("dotenv").config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SEC,
});
// Configure Multer Storage for Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        // Assuming the folder name is sent in the request body or query
        const folderName = req.query.leagueId + '-' + req.query.folderName || "default_folder";
        return {
            folder: `${folderName}/team_logo`, // Dynamic folder name
            allowed_formats: ["jpeg", "png", "jpg", "gif"], // Allowed formats
            public_id: `file_${Date.now()}`, // Optional: Add a custom public ID
        };
    },
});


const upload = multer({ storage });

router.get("/:leagueId", authenticateToken, async (req, res, next) => {
    const page = parseInt(req.query.page) || 1; // Default page is 1 if not provided
    const limit = parseInt(req.query.limit) || 32;
    const leagueId = req.params.leagueId;

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

router.post("/add", authenticateToken, upload.single("teamLogo"), async (req, res) => {
    const {
        teamName,
        teamOwner,
        teamOwnerPhone,
        leagueId,
        jerseyColor,
        maxAmountForBid,
        playerBasePrice,
        minimumPlayerCount
    } = req.query;

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
    const teamLogoUrl = req.file?.path || null;
    const query = `
        INSERT INTO teams (
            team_name, team_owner, team_owner_phone, league_id, jersey_color, team_logo,
            logo_url,max_amount_for_bid,balance_amount,max_amount_per_player
        ) VALUES (?, ?, ?, ?, ?, ? , ? , ? , ? , ?)
    `;
    const MAX_AMOUNT_PER_PLAYER = Number(maxAmountForBid) - (Number(playerBasePrice) * (Number(minimumPlayerCount) - 1))
    const values = [
        teamName,
        teamOwner || null, // Optional field
        teamOwnerPhone || null, // Optional field
        leagueId,
        jerseyColor || null, // Optional field
        req.file?.originalname || null,// Optional field
        teamLogoUrl,
        maxAmountForBid,//Initially both are equal
        maxAmountForBid,
        MAX_AMOUNT_PER_PLAYER
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


router.post(
    "/update",
    authenticateToken,
    async (req, res) => {
        const { teamName, teamOwner, teamOwnerPhone, jerseyColor, teamId, maxAmountForBid,minimumPlayerCount,
            playerBasePrice } = req.query;

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
                jersey_color = ? ,
                max_amount_for_bid = ?,
                balance_amount = ?,
                max_amount_per_player = ?
            WHERE team_id = ?
        `;
        const MAX_AMOUNT_PER_PLAYER = Number(maxAmountForBid) - (Number(playerBasePrice) * (Number(minimumPlayerCount) - 1))

        const values = [
            teamName,
            teamOwner || null,
            teamOwnerPhone || null,
            jerseyColor || null,
            maxAmountForBid,
            maxAmountForBid,
            MAX_AMOUNT_PER_PLAYER,
            teamId,
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
                responseData: {
                    updatedTeam: {
                        teamName,
                        teamOwner,
                        teamOwnerPhone,
                        jerseyColor,
                        teamId,
                    },
                },
            });
        } catch (error) {
            return sendServerError(res, error);
        }
    }
);

router.get("/player/:teamId", authenticateToken, async (req, res, next) => {
    const page = parseInt(req.query.page) || 1; // Default page is 1 if not provided
    const limit = parseInt(req.query.limit) || 10;
    const teamId = req.params.teamId;

    // Query to fetch leagues created by the logged-in user
    const playerByTeamListQuery = `SELECT * FROM player_league_team_view WHERE sold_to = ?`;
    const params = [teamId];

    try {
        const results = await paginate(
            playerByTeamListQuery,
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

router.get("/listWithPlayerCount/:leagueId", authenticateToken, async (req, res, next) => {
    const leagueId = req.params.leagueId;

    // Query to fetch leagues created by the logged-in user
    const teamListQuery = `SELECT 
                    t.team_id,
                    t.team_name,
                    t.team_owner,
                    t.team_owner_phone,
                    t.jersey_color,
                    t.team_logo,
                    t.max_amount_for_bid,
                    t.balance_amount,
                    t.max_amount_per_player,
                    COUNT(p.player_id) AS player_count
                FROM 
                    teams t
                LEFT JOIN 
                    player_details p ON t.team_id = p.sold_to AND t.league_id = p.league_id
                WHERE 
                    t.league_id = ?
                GROUP BY 
                    t.team_id`;
    const params = [leagueId];

    try {
        const [results] = await db.query(teamListQuery, params)
        const formattedResponseData = toCamelCase(results);
        // Sending a structured response
        res.status(200).json({
            statusCode: 200,
            isError: false,
            responseData: {
                data: formattedResponseData
            },
            statusText: "Items retrieved successfully",
        });
    } catch (error) {
        return sendServerError(res, error); // Forwarding error to a helper function
    }
});
module.exports = router;