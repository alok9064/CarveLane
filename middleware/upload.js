import multer from 'multer';
import path from 'path';

// Setup storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/'), // upload folder
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `custom-${Date.now()}${ext}`;
    cb(null, uniqueName);
  }
});

export const upload = multer({ storage });

// // Multer storage config
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/uploads'); // upload folder
//   },
//   filename: (req, file, cb) => {
//     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//     cb(null, uniqueSuffix + path.extname(file.originalname));
//   }
// });
// const upload = multer({ storage: storage });