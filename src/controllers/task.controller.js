import asyncHandler from '../utils/asyncHandler.js'
import ApiError from "../utils/ApiError.js"
import {deleteOnCloudinary, uploadOnCloudinary} from '../utils/cloudinary.js'
import ApiResponse from '../utils/ApiResponse.js'
import { Task } from '../models/task.model.js'
import {isValidObjectId} from "mongoose"

// get all tasks

const getAllTasks = asyncHandler(async(req,res) => {
    const {page=1,limit=10,query,sortBy,sortType,status} = req.query

    const pipeline = []

    if(query) {
        pipeline.push({
            $search: {
                index: "search-task",
                text: {
                    query: query,
                    path: ["title"]
                }
            }
        })
    }

    if(status) {
        const allowed =  ["pending","active", "completed"]

        if(!allowed.includes(status)) {
            throw new ApiError(400, "Invalid status value");
        }

        pipeline.push({
            $match: {status}
        })
    }

    if(sortBy && sortType) {
        pipeline.push({
           $sort: {[sortBy]: sortType === "asc" ? 1:-1}  
        })
    } else {
        pipeline.push({
            $sort: {createdAt: -1},
        })
    }

    

    const taskAggregate = Task.aggregate(pipeline)
    const options = {
        page: parseInt(page,10),
        limit: parseInt(limit,10)
    }

    const tasks = await Task.aggregatePaginate(taskAggregate,options)

    if(!tasks) {
        throw new ApiError(404, "error occured while fetching tasks")
    }

    return res
            .status(200)
            .json(new ApiResponse(200, tasks, "tasks fetched successfully"))

})

// create task
const createTask = asyncHandler(async(req,res) => {
    // get data from req
    // get attachment from req.file
    // apply validations
    // create an obj and send to db
    // show error in case of failure
    // send res

    const {title,description,dueDate, status} = req.body

    if (!title || !dueDate) {
        throw new ApiError(400, "title and dueDate required")
    }

    let attachment = null
    if (req.file?.path) {

        const uploaded = await uploadOnCloudinary(req.file?.path)

        if (!uploaded) {
            throw new ApiError(500, "File upload failed");
        }

        attachment = {
            url: uploaded.url,
            public_id: uploaded.public_id,
        }

    }
    

    const task = await Task.create(
        {
            title,
            description: description || '',
            dueDate: new Date(dueDate),
            status,
            attachment,
            owner: req.user?._id
        }
    )

    if (!task) {
        throw new ApiError(500, "Something went wrong while creating task")
    }

    return res
            .status(200)
            .json(new ApiResponse(200, task, "task created successfully"))

})

// get single task 
const getTask = asyncHandler(async(req,res) => {

    // get task id from params
    // validate
    // make db call to get data
    // show error in case of failed call
    // return res

    const {taskId} = req.params

    if(!isValidObjectId(taskId)) {
        throw new ApiError(400,"Invalid taskId")
    }

    const task = await Task.findOne({_id: taskId, owner: req.user?._id})

    if(!task) {
        throw new ApiError(404,"task not found")
    }

    return res
            .status(200)
            .json(new ApiResponse(200, task, "task fetched successfully"))

})

// update task
const updateTask = asyncHandler(async(req,res) => {

    // get task id and related details and files
    // validate
    // update fields
    // return res

    const {taskId} = req.params
    const {title,description,dueDate,status} = req.body

    if (!isValidObjectId(taskId)) {
        throw new ApiError(400, "Invalid taskId");
    }

    if (!title || !dueDate) {
        throw new ApiError(400, "title and dueDate required")
    }

    let attachment = null

    if (req.file?.path) {
        const uploaded = await uploadOnCloudinary(req.file?.path)

        if (!uploaded) {
            throw new ApiError(500, "File upload failed");
        }

        attachment = {
            url: uploaded.url,
            public_id: uploaded.public_id,
        }
    }

    const updatePayload = {
        title,
        description: description || "",
        dueDate: new Date(dueDate),
        status,
      };
    
      if (attachment) {
        updatePayload.attachment = attachment;
      }

    const updatedTask = await Task.findByIdAndUpdate(
        taskId,
        updatePayload,
        {
            new: true,
            runValidators: true
        }
    )

    if (!updatedTask) {
        throw new ApiError(404, "Task not found or update failed")
    }

    return res
            .status(200)
            .json(new ApiResponse(200, updatedTask, "task updated successfully"))

})

// delete task
const deleteTask = asyncHandler(async(req,res) => {

    const {taskId} = req.params

    if (!isValidObjectId(taskId)) {
        throw new ApiError(400, "invalid taskId");
    }

    // find task and get public_id of attachment
    const task = await Task.findById(taskId)

    if (!task) {
        throw new ApiError(404, "task not found or already deleted");
    }

    const attachmentPublicId = task.attachment?.public_id;

    const deletedTask = await Task.findByIdAndDelete(taskId)

    if(!deletedTask) {
        throw new ApiError(404, "task not found or already deleted")
    }

    if(attachmentPublicId) {
        await deleteOnCloudinary(attachmentPublicId, "raw")
    }

    return res
            .status(200)
            .json(new ApiResponse(200,{}, "task deleted successfully"))

})

const toggleTaskStatus = asyncHandler(async(req,res) => {

    const { taskId } = req.params
    const { status } = req.body

    if(!isValidObjectId(taskId)) {
        throw new ApiError(400, "Invalid taskId")
    }

     // Validate the status input
     const allowedStatuses = ["pending", "active", "completed"];
     if (!status || !allowedStatuses.includes(status)) {
         throw new ApiError(400, "Invalid status value. Allowed values: pending, active, completed")
     }

    const task = await Task.findById(taskId)

    if(!task) {
        throw new ApiError(404,"No task found")
    }

    const toggledTask = await Task.findByIdAndUpdate(
        taskId,
        {
            $set: {
                status: status
            }
        },
        {
            new: true
        }
    )

    console.log(toggledTask);
    
    if(!toggledTask) {
        throw new ApiError(500, "Failed to update task status")
    }

    return res
            .status(200)
            .json(new ApiResponse(200, toggledTask, "Task status updated successfully"))
}) 

export {
    createTask,
    getTask,
    updateTask,
    deleteTask,
    getAllTasks,
    toggleTaskStatus
}