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
// Configure Multer Storage for Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "updated_user_dp",
        allowed_formats: ["jpeg", "png", "jpg", "gif"],
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
module.exports = router;