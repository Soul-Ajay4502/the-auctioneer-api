const express = require("express");
const router = express.Router();
const paginate = require("../../../commonFunctions/paginator");
const authenticateToken = require("../../../middlewares/checkAuth");
const toCamelCase = require("../../../commonFunctions/toCamelCase");
const sendServerError = require("../../../commonFunctions/sendServerError");
const { v2: cloudinary } = require("cloudinary");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const db = require("../../../config/db");
require("dotenv").config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SEC,
});
// // Configure Multer Storage for Cloudinary
// const storage = new CloudinaryStorage({
//     cloudinary: cloudinary,
//     params: {
//         folder: "updated_user_dp",
//         allowed_formats: ["jpeg", "png", "jpg", "gif"],
//     },
// });

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
      // Assuming the folder name is sent in the request body or query
      const folderName =  req.query.folderName || "default_folder";
      const fileName=req.query.fileName||`file_${Date.now()}`
      return {
        folder: `${folderName}/player_dp`, // Dynamic folder name
        allowed_formats: ["jpeg", "png", "jpg", "gif"], // Allowed formats
        public_id: fileName.replace(/\s+/g, ''), // Optional: Add a custom public ID
        overwrite: true,
      };
    },
  });
const upload = multer({ storage });

router.get("/:leagueId", authenticateToken, async (req, res, next) => {
    const page = parseInt(req.query.page) || 1; // Default page is 1 if not provided
    const limit = parseInt(req.query.limit) || 10;
    const leagueId = req.params.leagueId;

    // Query to fetch leagues created by the logged-in user
    const leagueListQuery = `SELECT * FROM player_details WHERE league_id = ?`;
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

router.post(
    "/update",
    upload.single("playerDp"),
    authenticateToken,
    async (req, res) => {
        const { playerId, prevDpFile } = req.query;
        const newDpFile = req.file?.path;  // Access the file path of the uploaded image

        // Validate input fields (playerId is mandatory)
        if (!playerId) {
            return res.status(400).json({
                statusCode: 400,
                isError: true,
                statusText: "player Id is required",
                responseData: [],
            });
        }

        if (!newDpFile) {
            return res.status(400).json({
                statusCode: 400,
                isError: true,
                statusText: "New player photo is required",
                responseData: [],
            });
        }

        // Delete previous image from Cloudinary
        await cloudinary.api.delete_resources([prevDpFile], { type: 'upload', resource_type: 'image' });

        // Update player photo in the database
        const query = `
                UPDATE player_details 
                    SET player_photo = ?,
                    is_updated_dp = 1
                WHERE player_id = ?
            `;

        const values = [
            newDpFile,  // Pass the new image URL from Cloudinary
            playerId
        ];

        try {
            const [rows, fields] = await db.query(query, values);

            // Check if any rows were affected
            if (rows.affectedRows === 0) {
                return res.status(404).json({
                    statusCode: 404,
                    isError: true,
                    statusText: "Player not found",
                    responseData: [],
                });
            }

            return res.status(200).json({
                statusCode: 200,
                isError: false,
                statusText: "Player photo updated successfully",
                responseData: {
                    playerId,
                    newPlayerPhoto: newDpFile,
                },
            });
        } catch (error) {
            return sendServerError(res, error);
        }

    }
);

router.get("/playerIds/:leagueId", authenticateToken, async (req, res, next) => {
    const leagueId = req.params.leagueId;
    let isUnsoldList = false;
    // Query to fetch leagues created by the logged-in user
    const leaguePlayeListQuery = `SELECT * FROM player_details WHERE league_id = ? AND sold_to IS NULL AND is_unsold = ? LIMIT 15`;
    const params = [leagueId];

    try {
        const [rows] = await db.query(leaguePlayeListQuery, [...params, 'no'])
        let formattedResponseData;
        if (rows.length == 0) {
            const leaguePlayeUnsoldListQuery = `SELECT * FROM player_details WHERE league_id = ? AND sold_to IS NULL AND is_unsold = ? LIMIT 15`;
            const [unsoldRows] = await db.query(leaguePlayeUnsoldListQuery, [...params, 'yes'])
            formattedResponseData = toCamelCase(unsoldRows);
            isUnsoldList = unsoldRows.length > 0;

        }
        else {
            formattedResponseData = toCamelCase(rows);
        }
        // Sending a structured response
        res.status(200).json({
            statusCode: 200,
            isError: false,
            isUnsoldList: isUnsoldList,
            responseData: formattedResponseData,
            statusText: "Items retrieved successfully",
        });
    } catch (error) {
        return sendServerError(res, error); // Forwarding error to a helper function
    }
});

router.post("/sell", authenticateToken, async (req, res, next) => {
    const { playerId, soldTo, soldAmount, playerBasePrice } = req.body;

    try {
        conn = await db.connection();
    } catch (error) {
        return sendServerError(res, error);
    }
    const teamDetailsQuery = 'SELECT * FROM teams WHERE team_id = ?'
    const teamParams = [soldTo]
    const playerCountQuery = 'SELECT COUNT(*) AS player_count_in_team FROM player_details WHERE sold_to = ?'
    const playerCountParams = [soldTo]
    const [playerCount] = await conn.query(playerCountQuery, playerCountParams);
    const [teamDetails] = await conn.query(teamDetailsQuery, teamParams);
    let team;

    if (teamDetails.length == 0) {
        return res.status(400).json({
            statusCode: 400,
            isError: false,
            responseData: '',
            statusText: "team not found",
        });
    }
    team = teamDetails[0];
    const teamPlayerCount = playerCount[0]
    await conn.beginTransaction();
    const balanceAmount = Number(team.balance_amount) - Number(soldAmount)
    const maxAmountPerPlayerBalance = balanceAmount - ((11 - (Number(teamPlayerCount.player_count_in_team) + 1)) * Number(playerBasePrice))
console.log('maxAmountPerPlayerBalance',maxAmountPerPlayerBalance);
console.log('balanceAmount',balanceAmount);

    const sellQuery = 'UPDATE player_details SET sold_to = ? , sold_amount = ? WHERE player_id = ?'
    const sellParams = [soldTo, soldAmount, playerId]
    const updateTeamQuery = 'UPDATE teams SET balance_amount = ? , max_amount_per_player = ? WHERE team_id = ?'
    const updateTeamParams = [balanceAmount, maxAmountPerPlayerBalance, soldTo]
    if(team.is_auction_started == 'no')
    {
        const updateTeamForAuctionStartQuery = 'UPDATE teams SET is_auction_started = ? WHERE league_id = ?';
        await conn.query(updateTeamForAuctionStartQuery, ['yes',team.league_id]);

    }
    await conn.query(sellQuery, sellParams);

    // Update team details
    await conn.query(updateTeamQuery, updateTeamParams);

    await conn.commit(); // Commit the transaction

    try {

        res.status(200).json({
            statusCode: 200,
            isError: false,
            isUnsoldList: '',
            responseData: '',
            statusText: "Items retrieved successfully",
        });
    } catch (error) {
        await conn.rollback();
        return sendServerError(res, error); // Forwarding error to a helper function
    } finally {
        conn?.release(); // Release the connection back to the pool
    }

});


router.post("/unsold", authenticateToken, async (req, res, next) => {
    const { playerId } = req.body;
    const unsoldQuery = 'UPDATE player_details SET is_unsold = ? WHERE player_id = ?'
    const [response] = await db.query(unsoldQuery, ['yes', playerId])
    try {

        res.status(200).json({
            statusCode: 200,
            isError: false,
            responseData: response,
            statusText: "Player Unsold",
        });
    } catch (error) {
        return sendServerError(res, error); // Forwarding error to a helper function
    }
});

module.exports = router;