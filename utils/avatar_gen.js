const fs = require('fs-extra');
const path = require('path');
const svg2img = require('svg2img');
const axios = require('axios');
// const {createAvatar} = require('@dicebear/avatars')
// const loreleiSprites = require('@dicebear/avatars-lorelei-sprites').default;
// const { createAvatar } = require('@dicebear/core');
// const { lorelei } = require('@dicebear/collection');
/**
 * Generates an avatar with random features and saves it as a JPEG file.
 * @param {string} seed - The seed for the avatar generation.
 * @param {string} outputFolder - The folder where the JPEG file will be saved.
 * @param {string} fileName - The name of the JPEG file (without extension).
 * @returns {Promise<void>}
 */
// Function to generate a random value from an array of options
function getRandomOption(options) {
    return options[Math.floor(Math.random() * options.length)];
}

/**
 * Generates a random Personas-style avatar with custom traits and saves it as a JPEG file.
 * @param {string} seed - The seed for the avatar generation (used for randomization).
 * @param {string} outputFolder - The folder where the JPEG file will be saved.
 * @param {string} fileName - The name of the JPEG file (without extension).
 * @returns {Promise<void>}
 */
async function generateAvatar(seed, outputFolder, fileName) {
    // Available traits for randomization
    const eyesOptions = ['default', 'serious', 'wink', 'happy', 'sad'];
    const hairOptions = ['short', 'long', 'curly', 'bald', 'bun'];
    const faceOptions = ['default', 'smile', 'frown', 'neutral', 'laugh'];

    // Randomize each trait
    const eyes = getRandomOption(eyesOptions);
    const hair = getRandomOption(hairOptions);
    const face = getRandomOption(faceOptions);

    // Dicebear HTTP API endpoint for Personas avatars with customized traits
    const apiUrl = `https://api.dicebear.com/9.x/personas/svg?seed=abc&eyes=${eyes}&hair=${hair}&face=${face}`;

    try {
        // Fetch the avatar as an SVG image with random traits
        const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });

        // Ensure the output folder exists
        if (!fs.existsSync(outputFolder)) {
            fs.mkdirSync(outputFolder, { recursive: true });
        }

        // Save the SVG as a file
        const svgPath = path.join(outputFolder, `${fileName}.svg`);
        fs.writeFileSync(svgPath, response.data);

        console.log(`Avatar saved as SVG to ${svgPath}`);

        // Convert the SVG to a JPEG image (optional)
        // You can use a library like svg2img for the conversion
        const svg2img = require('svg2img');
        svg2img(response.data, { format: 'jpeg', width: 512, height: 512 }, (err, buffer) => {
            if (err) {
                console.error('Error converting SVG to JPEG:', err);
                return;
            }

            const jpegPath = path.join(outputFolder, `${fileName}.jpg`);
            fs.writeFileSync(jpegPath, buffer);
            console.log(`Avatar saved as JPEG to ${jpegPath}`);
        });

    } catch (error) {
        console.error('Error generating avatar:', error);
    }
}

// Example usage
// const seed = Math.random().toString(36).substring(2, 15); // Random seed for unique avatars
// const outputFolder = './avatars';
// const fileName = 'random_personas_avatar';

// generateRandomAvatar(seed, outputFolder, fileName);

module.exports = { generateAvatar };