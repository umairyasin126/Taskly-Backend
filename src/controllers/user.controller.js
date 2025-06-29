import asyncHandler from '../utils/asyncHandler.js'
import ApiError from "../utils/ApiError.js"
import {User} from '../models/user.model.js'
import {deleteOnCloudinary, uploadOnCloudinary} from '../utils/cloudinary.js'
import ApiResponse from '../utils/ApiResponse.js'
import jwt from "jsonwebtoken"




const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken,refreshToken}

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler(async (req,res) => {
    const {fullname,email,username,password} = req.body

    //validation

    if (
        [fullname,username,email,password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{username},{email}]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username alerady exists")
    }

    const avatarLocalPath = req.file?.path
    
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
 
    
    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    const user = await User.create({
        fullname,
        avatar: {
            url: avatar.url,
            public_id: avatar.public_id
        },
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering user")
    }

    return res
            .status(200)
            .json(new ApiResponse(200, createdUser, "User registered successfully"))

})

const loginUser = asyncHandler(async(req,res) => {
    const {username,email,password} = req.body

    if (!username && !email) {
        throw new ApiError(400, "username or email is required")
    }

    const user =  await User.findOne({
        $or: [{username},{email}]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }

    const {refreshToken,accessToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true,
        sameSite: 'none'
    }

    return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User logged in successfully"
            ))

})

const logoutUser = asyncHandler(async (req,res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true,
        sameSite: 'none'
    }

    return res
            .status(200)
            .clearCookie("accessToken", options)
            .clearCookie("refreshToken", options)
            .json(new ApiResponse(200, {}, "User logged out successfully"))

})

const changeCurrentPassword = asyncHandler(async (req,res) => {
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect) {
        throw new ApiError(400, "Ïnvalid old password")
    }

    user.password = newPassword

    await user.save({validateBeforeSave: false})

    return res
            .status(200)
            .json(new ApiResponse(200,{}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler(async (req,res) => {
    return res
            .status(200)
            .json(new ApiResponse(200, req.user, "Current user fetched successfully"))
})

const updateAccountDetails = asyncHandler(async(req,res) => {
    const {fullname,email} = req.body

    if (!fullname || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                email
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res
            .status(200)
            .json(new ApiResponse(200, user, "Account details updated successfully"))
})

const updateUserAvatar = asyncHandler(async(req,res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        new ApiError(400, "Avatar file is missing")
    }

    const old_user = await User.findById(req.user?._id).select("avatar")
    console.log("Old User", old_user);

    const avatarToDelete = old_user.avatar

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: {
                    url: avatar.url,
                    public_id: avatar.public_id
                }
            }
        },
        {
            new: true
        }
    ).select("-password")

    if (avatarToDelete) {
        await deleteOnCloudinary(avatarToDelete)
    }

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfull"))

})

const refreshAccessToken = asyncHandler(async(req,res)=> {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401,"Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id)

        if(!user) {
            throw new ApiError(401, "Invalid referesh token")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
        }

        const options = {
            httpOnly: true,
            secure: true,
            sameSite: 'none'
        }

        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)

        return res
                .status(200)
                .cookie("accessToken", accessToken, options)
                .cookie("refreshToken", newRefreshToken, options)
                .json(
                    new ApiResponse(200, {accessToken,refreshToken: newRefreshToken}, "Access token refreshed")
                )
    } catch (error) {
        throw new ApiError(404, error?.message || "Invalid refresh token")
    }

})



export {
    registerUser,
    loginUser,
    logoutUser,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    refreshAccessToken,
    
}

