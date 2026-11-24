const cloudinary = require('../config/cloudinary');

function uploadToCloudinary(buffer) {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
            {
                folder: 'mini-project/posts',
                resource_type: 'image'
            },
            (error, result) => {
                if (error) {
                    return reject(error);
                }
                resolve(result);
            }
        ).end(buffer);
    });
}

async function destroyCloudinaryImage(publicId) {
    if (!publicId) return;
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (cleanupError) {
        console.error('Image cleanup error:', cleanupError);
    }
}

module.exports = {
    uploadToCloudinary,
    destroyCloudinaryImage
};
