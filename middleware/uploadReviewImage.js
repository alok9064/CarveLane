import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/reviews");
  },
  filename: (req, file, cb) => {
    const uniqueName = `review-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

export const uploadReviewImage = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});
