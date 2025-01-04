const crypto = require('crypto');
const bcrypt = require("bcryptjs");

// Function to generate OTP and set validity
function generateOTP(length = 6, validityInMinutes = 5) {
    // Generate a random numeric OTP
    const otp = crypto.randomInt(0, Math.pow(10, length)).toString().padStart(length, '0');

    // Calculate the expiration time
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + validityInMinutes);

    // Return the OTP and expiration time
    return {
        otp,
        expiresAt
    };
}

// Function to verify OTP
function verifyOTP(inputOtp, generatedOtp, expirationTime) {
    const now = new Date();
    if (now > new Date(expirationTime)) {
        return { isValid: false, message: "OTP expired" };
    }
    if (inputOtp !== generatedOtp) {
        return { isValid: false, message: "Invalid OTP" };
    }
    return { isValid: true, message: "OTP verified successfully" };
}


// Function to encrypt a password
async function encryptPassword(password) {
    try {
        // Define the number of salt rounds
        const saltRounds = 10;

        // Generate a salt
        const salt = await bcrypt.genSalt(saltRounds);

        // Hash the password with the salt
        const hashedPassword = await bcrypt.hash(password, salt);

        return hashedPassword;
    } catch (error) {
        console.error("Error encrypting password:", error);
        throw new Error("Password encryption failed");
    }
}



module.exports = {generateOTP,verifyOTP,encryptPassword};