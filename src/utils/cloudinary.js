import {v2 as cloudinary} from "cloudinary"
import fs from "fs"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
})

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null

        const isPdf = /\.pdf$/i.test(localFilePath);
        const resourceType = isPdf ? "raw" : "auto";

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: resourceType,
        })

        fs.unlinkSync(localFilePath)

        return response

    } catch (error) {
        fs.unlinkSync(localFilePath)
        return null
    }
}

const deleteOnCloudinary = async (public_id, resourceType = "image") => {
    try {
       
       const response = await cloudinary.uploader.destroy(public_id, {resource_type: resourceType})
       return response

    } catch (error) {
        throw error
    }
}

export {
    uploadOnCloudinary,
    deleteOnCloudinary
}