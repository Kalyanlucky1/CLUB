const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'tribeshub',
    allowed_formats: ['jpg', 'jpeg', 'png']
  }
});

const upload = multer({ storage: storage });

const uploadToCloudinary = async (filePath) => {
  try {
    const result = await cloudinary.uploader.upload(filePath);
    return result;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

module.exports = { upload, uploadToCloudinary };





// // // const cloudinary = require('cloudinary').v2;
// // // require('dotenv').config();

// // // cloudinary.config({
// // //   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
// // //   api_key: process.env.CLOUDINARY_API_KEY,
// // //   api_secret: process.env.CLOUDINARY_API_SECRET,
// // //   secure: true
// // // });

// // // const uploadToCloudinary = async (filePath) => {
// // //   try {
// // //     const result = await cloudinary.uploader.upload(filePath, {
// // //       folder: 'tribeshub',
// // //       use_filename: true,
// // //       unique_filename: false,
// // //       resource_type: 'auto'
// // //     });
// // //     return result;
// // //   } catch (error) {
// // //     console.error('Cloudinary upload error:', error);
// // //     throw error;
// // //   }
// // // };

// // // const deleteFromCloudinary = async (publicId) => {
// // //   try {
// // //     await cloudinary.uploader.destroy(publicId);
// // //   } catch (error) {
// // //     console.error('Cloudinary delete error:', error);
// // //     throw error;
// // //   }
// // // };

// // // module.exports = {
// // //   uploadToCloudinary,
// // //   deleteFromCloudinary
// // // };




// const cloudinary = require('cloudinary').v2;

// cloudinary.config({ 
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
//   api_key: process.env.CLOUDINARY_API_KEY, 
//   api_secret: process.env.CLOUDINARY_API_SECRET 
// });

// const uploadToCloudinary = async (filePath) => {
//   try {
//     const result = await cloudinary.uploader.upload(filePath, {
//       folder: 'tribeshub',
//       use_filename: true,
//       unique_filename: false
//     });
//     return result;
//   } catch (error) {
//     console.error('Cloudinary upload error:', error);
//     throw error;
//   }
// };

// module.exports = { uploadToCloudinary };












// // const cloudinary = require('cloudinary').v2;
// // const fs = require('fs');

// // // Configure Cloudinary
// // cloudinary.config({
// //   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
// //   api_key: process.env.CLOUDINARY_API_KEY,
// //   api_secret: process.env.CLOUDINARY_API_SECRET
// // });

// // // Upload to Cloudinary
// // const uploadToCloudinary = async (filePath) => {
// //   try {
// //     const result = await cloudinary.uploader.upload(filePath, {
// //       folder: 'tribeshub',
// //       use_filename: true,
// //       unique_filename: false,
// //       resource_type: 'auto'
// //     });

// //     // Delete file from local storage
// //     fs.unlinkSync(filePath);

// //     return result;
// //   } catch (error) {
// //     // Delete file from local storage if upload fails
// //     if (fs.existsSync(filePath)) {
// //       fs.unlinkSync(filePath);
// //     }
// //     throw error;
// //   }
// // };

// // module.exports = { uploadToCloudinary };