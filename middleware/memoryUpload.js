// middleware/memoryUpload.js
import multer from "multer";

export const memoryUpload = multer({ storage: multer.memoryStorage() });
