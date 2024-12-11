const axios = require('axios');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
require("dotenv").config();

// Set up Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SEC,
});

// Function to download file from Google Drive
const downloadFileFromGoogleDrive = async (fileUrl) => {
  const fileId = extractFileId(fileUrl);
  const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

  try {
    const response = await axios({
      method: 'GET',
      url: downloadUrl,
      responseType: 'stream',
      timeout: 800000, 
    });

    // Create a temp file to save the downloaded content
    const contentType = response.headers['content-type'];

    // Determine the file extension based on the MIME type
    let fileExtension = '';
    if (contentType) {
        if (contentType.includes('image/jpeg')) {
            fileExtension = '.jpg';
        } else if (contentType.includes('image/png')) {
            fileExtension = '.png';
        } else if (contentType.includes('image/webp')) {
            fileExtension = '.webp';

        }else if (contentType.includes('text/html')) {
            fileExtension = '.html';

        } else {
            fileExtension = '.jpg'; // Default case for unknown types
        }
    }
    const tempFilePath = path.join(__dirname, `tempfile${fileExtension}`);
    console.log('tempFilePathtempFilePath',tempFilePath);
    
    const writer = fs.createWriteStream(tempFilePath);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(tempFilePath));
      writer.on('error', (err) => reject(err));
    });
  } catch (err) {
    console.error('Error downloading file:', err);
    throw err;
  }
};

// Function to extract file ID from Google Drive URL
const extractFileId = (url) => {
  const regex = /(?:drive\.google\.com\/open\?id=)([\w-]+)/;
  const match = url.match(regex);
  if (match && match[1]) {
    return match[1];
  }
  throw new Error('Invalid Google Drive URL');
};

// Function to upload file to Cloudinary
const uploadFileToCloudinary = async (filePath) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: 'image', // Automatically detect file type
      public_id: `uploaded_file_${Date.now()}`, // Set a unique public ID
    });

    // Return the public URL of the uploaded file
    return result.secure_url;
  } catch (err) {
    console.error('Error uploading file to Cloudinary:', err);
    throw err;
  }
};

// Main function to handle downloading and uploading
const handleFileUpload = async (googleDriveUrls) => {
  try {
    const uploadedUrls = [];

    for (const url of googleDriveUrls) {
      const tempFilePath = await downloadFileFromGoogleDrive(url);
      const cloudinaryUrl = await uploadFileToCloudinary(tempFilePath);

      // Store the Cloudinary URL in the array
      uploadedUrls.push(cloudinaryUrl);

      // Clean up the temp file
      fs.unlinkSync(tempFilePath);
    }

    return uploadedUrls;
  } catch (err) {
    console.error('Error processing files:', err);
    throw err;
  }
};


// Map parsed data to file upload process
const uploadPlayerFiles = async (playersData) => {
  const googleDriveUrls = playersData.map(player => [
    player.PHOTO,
    // player.PAYMENT_PROOF,
    // player.ID_PROOF,
  ]).flat();

  try {
    const uploadedUrls = await handleFileUpload(googleDriveUrls);
    console.log('Uploaded file URLs:', uploadedUrls);

    // Now you can use the uploaded URLs (e.g., to store them in your database)
    playersData.forEach((player, index) => {
        player.PHOTO = uploadedUrls[index];
    //   player.PHOTO = uploadedUrls[index * 3];
    //   player.PAYMENT_PROOF = uploadedUrls[index * 3 + 1];
    //   player.ID_PROOF = uploadedUrls[index * 3 + 2];
    });

    console.log('Updated player data with Cloudinary URLs:', playersData);
    return playersData
  } catch (err) {
    console.error('Error uploading player files:', err);
    return []
  }
};

// Call the function with your parsed data
module.exports = uploadPlayerFiles;

