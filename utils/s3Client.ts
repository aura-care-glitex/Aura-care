import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import dotenv from 'dotenv';

dotenv.config();

const s3Client = new S3Client({
    region: process.env.AWS_REGION as string ,
    endpoint: process.env.AWS_ENDPOINT_URL_S3 as string,
    forcePathStyle: true,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    }
});

export const uploadImage = async function (file:any){
    try {
        const fileName = `image-${file.originalname}`;

        const uploadParams = {
            Bucket: "calendery",
            Key: fileName,
            Body: file.buffer,
            ContentType: file.mimetype
        };

        await s3Client.send(new PutObjectCommand(uploadParams));

        // Construct the image URL
        const imageUrl = `${process.env.AWS_ENDPOINT_URL_S3}/calendery/${fileName}`;

        return { imageUrl:imageUrl, imageKey: fileName }; // Return URL and key to store in database
    } catch (error) {
        console.log("S3 Upload Error:", error);
        return null;
    }
};

export const deleteImage = async function (imageKey:string){
    try {
        const deleteParams = {
            Bucket: "calendery",
            Key: imageKey
        };

        await s3Client.send(new DeleteObjectCommand(deleteParams));
        console.log("Old image deleted successfully")
    } catch (error) {
        console.log("S3 Delete Error:", error);
    }
}