const bcrypt = require('bcryptjs');

// Generate a random number with a given number of digits
function generateRandomNumber(digits = 6) {
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Hash a password
async function hashPassword(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
}

// Compare a password with a hash
async function comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
}

module.exports = {
    generateRandomNumber,
    hashPassword,
    comparePassword
};
