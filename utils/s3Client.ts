import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import dotenv from 'dotenv';

dotenv.config();

const s3Client = new S3Client({
    region: process.env.AWS_REGION as string,
    endpoint: process.env.AWS_ENDPOINT_URL_S3 as string, // Supabase Storage URL
    forcePathStyle: true,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    }
});

export const uploadImage = async function (file: any) {
    try {
        const fileName = `image-${Date.now()}-${file.originalname}`; // Unique filename

        const uploadParams = {
            Bucket: "product-images", // Ensure correct bucket name
            Key: fileName,
            Body: file.buffer,
            ContentType: file.mimetype
        };

        await s3Client.send(new PutObjectCommand(uploadParams));

        // Construct the image URL
        const imageUrl = `${process.env.AWS_ENDPOINT_URL_S3}/product-images/${fileName}`;

        return { imageUrl, imageKey: fileName }; // Return URL and key to store in database
    } catch (error) {
        console.error("S3 Upload Error:", error);
        return null;
    }
};

export const deleteImage = async function (imageKey: string) {
    try {
        const deleteParams = {
            Bucket: "product-images",
            Key: imageKey
        };

        await s3Client.send(new DeleteObjectCommand(deleteParams));
        console.log("✅ Image deleted successfully");
    } catch (error) {
        console.error("❌ S3 Delete Error:", error);
    }
};
