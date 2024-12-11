const fs = require('fs');
const axios = require('axios');
const path = require('path');

// Function to extract file ID from the Google Drive URL
const extractFileId = (url) => {
    const regex = /(?:drive\.google\.com\/open\?id=)([\w-]+)/;
    const match = url.match(regex);

    if (match && match[1]) {
        return match[1];
    }
    throw new Error('Invalid Google Drive URL');
};

// Function to download the public file and get the file extension
const downloadPublicFile = async (fileUrl, destPath = './downloaded_file') => {
    const fileId = extractFileId(fileUrl);  // Extract file ID from the URL
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

    // Make the GET request to download the file
    const response = await axios({
        method: 'GET',
        url: downloadUrl,
        responseType: 'stream',
    });

    const contentType = response.headers['content-type'];
    console.log(contentType);

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
            fileExtension = ''; // Default case for unknown types
        }
    }
 

    if (!fileExtension) {
        return
    }
    if (fileExtension == '.html')
        return { isPublic: false }
    destPath = path.join(destPath, `downloaded_file${fileExtension}`);


    const writer = fs.createWriteStream(destPath);

    return new Promise((resolve, reject) => {
        response.data
            .pipe(writer)
            .on('finish', () => {
                fs.unlink(destPath, (err) => {
                    if (err) {
                        console.error('Error deleting the file:', err);
                    } else {
                        console.log('File deleted successfully');
                    }
                });
                resolve({ isPublic: true });
                
            })
            .on('error', (err) => {
                // console.error('Error downloading file:', err);
                reject(err);
            });
    });
};

module.exports = downloadPublicFile;
