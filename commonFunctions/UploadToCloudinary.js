const axios = require('axios');
const cloudinary = require('cloudinary').v2;
const { PassThrough } = require('stream');
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
      responseType: 'arraybuffer', // Use arraybuffer to get data as a buffer
      timeout: 800000,
    });

    const contentType = response.headers['content-type'];
    let fileExtension = contentType.includes('image/png') ? '.png' : '.jpg';

    return { buffer: response.data, fileExtension };
  } catch (err) {
    console.error('Error downloading file:', err);
    throw err;
  }
};

// Function to extract file ID from Google Drive URL
const extractFileId = (url) => {
  const params = new URLSearchParams(new URL(url).search);
  const fileId = params.get('id');
  if (!fileId) throw new Error('Invalid Google Drive URL');
  return fileId;
};

// Function to upload file to Cloudinary
const uploadFileToCloudinary = async ({ buffer, fileExtension }) => {
  try {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          public_id: `uploaded_file_${Date.now()}`,
          transformation: [{ width: 800, height: 800, crop: 'limit' }], // Optional transformation
        },
        (err, result) => {
          if (err) return reject(err);
          resolve(result.secure_url);
        }
      );

      const stream = new PassThrough();
      stream.end(buffer);
      stream.pipe(uploadStream);
    });
  } catch (err) {
    console.error('Error uploading file to Cloudinary:', err);
    throw err;
  }
};

// Main function to handle downloading and uploading
const handleFileUpload = async (googleDriveUrls) => {
  try {
    const uploadPromises = googleDriveUrls.map(async (url) => {
      const fileData = await downloadFileFromGoogleDrive(url);
      const cloudinaryUrl = await uploadFileToCloudinary(fileData);
      return cloudinaryUrl;
    });

    const uploadedUrls = await Promise.all(uploadPromises);
    return uploadedUrls;
  } catch (err) {
    console.error('Error processing files:', err);
    throw err;
  }
};

// Map parsed data to file upload process
const uploadPlayerFiles = async (playersData) => {
  const googleDriveUrls = playersData.map(player => player.PHOTO).flat();

  try {
    const uploadedUrls = await handleFileUpload(googleDriveUrls);
    console.log('Uploaded file URLs:', uploadedUrls);

    // Map Cloudinary URLs back to players data
    playersData.forEach((player, index) => {
      player.PHOTO = uploadedUrls[index];
    });

    console.log('Updated player data with Cloudinary URLs:', playersData);
    return playersData;
  } catch (err) {
    console.error('Error uploading player files:', err);
    return [];
  }
};

// Export the function for use in other modules
module.exports = uploadPlayerFiles;
