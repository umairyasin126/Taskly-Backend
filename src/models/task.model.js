import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const taskSchema = new Schema(
    {
    title: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    description: {
        type: String
    },
    attachment: {
        type: {
            url: String, // cloudinary url
            public_id: String
        }
    },
    dueDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ["pending","active", "completed"],
        default: "pending"
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User"
    }
},
{
    timestamps: true
}
)

taskSchema.plugin(mongooseAggregatePaginate)

export const Task = mongoose.model("Task", taskSchema)