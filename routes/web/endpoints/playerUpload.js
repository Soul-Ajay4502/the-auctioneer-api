const express = require('express');
const router = express.Router();
const authenticateToken = require('../../../middlewares/checkAuth');
const fs = require('fs');
var path = require('path');
const fs_promise = require('fs').promises;
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);
const timeout = require("connect-timeout");
const db = require('../../../config/db')


let multer = require('multer');
const excel = require('exceljs');
const xlsx = require('xlsx');
const downloadPublicFile = require('../../../commonFunctions/DownloadGDrive');
const uploadPlayerFiles = require('../../../commonFunctions/UploadToCloudinary');


// set storage
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'temp');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${Date.now()}-CB-${file.originalname}`);
    },
});

// config multer
const upload = multer({
    storage: storage,
});

router.get(
    '/download',
    authenticateToken,
    async (req, res, next) => {
        try {
            const desiredDirectory = path.join(__dirname, '..', '..', '..'); // Go up three levels

            const filePath = path.join(
                desiredDirectory,
                'public',
                'excel',
                'PLAYER_UPLOAD_TEMPLATE.xlsx'
            );
            var file = fs.readFileSync(filePath);
            res.status(200);
            res.setHeader('Content-Type', 'text/xlsx'); // Correct content type for xlsx
            res.setHeader(
                'Content-Disposition',
                'attachment; filename=ALUMNI_BULK_UPLOAD_TEMPLATE.xlsx'
            );
            res.write(file, 'binary');
            res.end();
        } catch (error) {
            return send500Error(res, error);
        }
    }
);

router.post(
    "/upload",
    authenticateToken,
    timeout("5m"),
    upload.single("csv_file"),
    async (req, res, next) => {
        const leagueId = req.query.league_id;

        //Check if the user clicks upload without selecting a file
        try {
            if (req.file == undefined) {
                await fs_promise.unlink(req.file?.path);
                return res
                    .status(400)
                    .json({
                        statusCode: 400,
                        isError: true,
                        responseData: [],
                        statusText: "Please Upload a Valid File",
                    })
                    .end();
            } else {
                // Read the file using pathname
                const fileName = req.file?.originalname;
                const fileExtension = fileName.split(".").pop().toLowerCase();

                //Check if it is a csv file
                if (fileExtension !== "xlsx") {
                    await fs_promise.unlink(req.file?.path);
                    return res
                        .status(400)
                        .json({
                            statusCode: 400,
                            isError: true,
                            responseData: [],
                            statusText: "Please Upload a excel File",
                        })
                        .end();
                }
                const fileSize = byteConverter(req.file.size).mb;
                if (fileSize > 2) {
                    await fs_promise.unlink(req.file?.path);
                    return res
                        .status(400)
                        .json({
                            statusCode: 400,
                            isError: true,
                            responseData: [],
                            statusText: `File size should be less than 2 mb`,
                        })
                        .end();
                }
                //sheet info from the file
                const file = xlsx.readFile(req.file?.path, { cellDates: true });

                const sheetNames = file.SheetNames;
                const totalSheets = sheetNames.length;
                let parsedData = [];
                if (totalSheets > 1) {
                    await fs_promise.unlink(req.file?.path);
                    return res
                        .status(400)
                        .json({
                            statusCode: 400,
                            isError: true,
                            responseData: [],
                            statusText: `Excel contain more than 1 sheet`,
                        })
                        .end();
                }
                // Loop through sheets
                for (let i = 0; i < totalSheets; i++) {
                    columnsArray = xlsx.utils.sheet_to_json(
                        file.Sheets[sheetNames[i]],
                        { header: 1 }
                    )[0];
                    // Convert to json using xlsx
                    const tempData = xlsx.utils.sheet_to_json(
                        file.Sheets[sheetNames[i]],
                        { blankrows: false, defval: null }
                    );
                    // Add the sheet's json to our data
                    parsedData.push(...tempData);
                }
                const expectedColumns = 11;
                const firstRow = columnsArray;

                // Define the expected headers
                const expectedHeaders = [
                    'REGISTRAION_TIME', 'PLAYER_NAME',
                    'PLACE', 'WHATSAPP_NO',
                    'CURRENT_TEAM', 'ROLE',
                    'BATTING_STYLE', 'BOWLING_STYLE',
                    'PHOTO', 'PAYMENT_PROOF',
                    'ID_PROOF'
                ];


                // Condition to check if the headers are proper
                if (!arraysEqual(firstRow, expectedHeaders)) {
                    await fs_promise.unlink(req.file?.path);
                    return res
                        .status(400)
                        .json({
                            statusCode: 400,
                            isError: true,
                            responseData: [],
                            statusText: `It seems the file does not have the correct headers, please check the file`,
                        })
                        .end();
                }
                //Check if the uploaded csv file is empty
                if (parsedData.length < 1) {
                    await fs_promise.unlink(req.file?.path);
                    return res
                        .status(400)
                        .json({
                            statusCode: 400,
                            isError: true,
                            responseData: [],
                            statusText: "Uploaded excel file is empty",
                        })
                        .end();
                }

                const actualColumns = Object.keys(firstRow).length;


                //Check if the uploaded excel file has the expected number of columns
                if (actualColumns !== expectedColumns) {
                    await fs_promise.unlink(req.file?.path);
                    return res
                        .status(400)
                        .json({
                            statusCode: 400,
                            isError: true,
                            responseData: [],
                            statusText: `Uploaded excel file does not have the correct number of columns`,
                        })
                        .end();
                }
                const expectedColumnOrder = [
                    "REGISTRAION_TIME",
                    "PLAYER_NAME",
                    "PLACE",
                    "WHATSAPP_NO",
                    "CURRENT_TEAM",
                    "ROLE",
                    "BATTING_STYLE",
                    "BOWLING_STYLE",
                    "PHOTO",
                    "PAYMENT_PROOF",
                    "ID_PROOF"
                ];

                for (let i = 0; i < columnsArray.length; i++) {
                    if (columnsArray[i] !== expectedColumnOrder[i]) {
                        await fs_promise.unlink(req.file?.path);
                        return res
                            .status(400)
                            .json({
                                statusCode: 400,
                                isError: true,
                                responseData: [],
                                statusText: `Incorrect column order. Expected "${expectedColumnOrder[i]
                                    }" at position ${i + 1}, found "${columnsArray[i]
                                    }"instead"`,
                            })
                            .end();
                    }
                }

                const sampleDataForCheckPermisson = parsedData[0]
                try {
                    const permissionResponse = await downloadPublicFile(sampleDataForCheckPermisson.PHOTO);
                    const paymentResponse = await downloadPublicFile(sampleDataForCheckPermisson.PAYMENT_PROOF);
                    const idResponse = await downloadPublicFile(sampleDataForCheckPermisson.ID_PROOF);
                    const { isPublic: isPhotoPublic } = permissionResponse;
                    const { isPublic: isPaymentPublic } = paymentResponse;
                    const { isPublic: isIdPublic } = idResponse;
                    
                    if (!isPhotoPublic || !isPaymentPublic || !isIdPublic) {
                        await fs_promise.unlink(req.file?.path);
                        return res
                            .status(400)
                            .json({
                                statusCode: 400,
                                isError: true,
                                responseData: [],
                                statusText: 'The Drive folder of the images has no public access,please grant it',
                            })
                            .end();
                    }

                    const updatedData = await uploadPlayerFiles(parsedData)

                    const query = `
                INSERT IGNORE INTO player_details (
                  registration_time, 
                  player_name, 
                  place, 
                  whatsapp_no, 
                  current_team, 
                  player_role, 
                  batting_style, 
                  bowling_style, 
                  player_photo, 
                  payment_screenshot, 
                  id_proof_url,
                  league_id
                ) 
                VALUES ?`;

                    // Map the provided data into the format required by the MySQL insert query
                    const values = updatedData.map(player => [
                        player.REGISTRAION_TIME,
                        player.PLAYER_NAME,
                        player.PLACE,
                        player.WHATSAPP_NO,
                        player.CURRENT_TEAM,
                        player.ROLE,
                        player.BATTING_STYLE,
                        player.BOWLING_STYLE,
                        player.PHOTO,
                        player.PAYMENT_PROOF,
                        player.ID_PROOF,
                        leagueId
                    ]);
                    let response=[];
                    if (updatedData.length > 0) {
                         [response] = await db.query(query, [values])
                    }
                    await fs_promise.unlink(req.file?.path);
                    return res
                        .status(200)
                        .json({
                            statusCode: 200,
                            isError: false,
                            responseData: response,
                            statusText: `Valid Template`,
                        })
                        .end();
                } catch (error) {
                    await fs_promise.unlink(req.file?.path);
                    return send500Error(res, error);
                }


            }
        } catch (error) {
            await fs_promise.unlink(req.file.path);
            return send500Error(res, error);
        }
    }
);
module.exports = router;

function byteConverter(bytes) {
    const kb = bytes / 1024;
    const mb = kb / 1024;
    return { kb: Math.round(kb) + 'kb', mb: mb.toFixed(2) };
}
function arraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) return false;
    }
    return true;
}
// supporting functions
function send500Error(res, error) {
    console.error(error);
    const errorMessage = getErrorMessage(error);
    res.status(500)
        .json({
            statusCode: 500,
            isError: true,
            responseData: error,
            statusText: errorMessage,
        })
        .end();
}

function isValid(val) {
    return !str || str.length === 0;
}

function getErrorMessage(error) {
    if (error.errno) {
        if (error.errno === 1062) {
            return "Duplicate entry not permitted";
        } else if (error.errno === 1451) {
            return "Operation not permitted on this item";
        } else {
            return error.sqlMessage
        }

    } else {
        return "Oops !. Please try again later.";
    }
}