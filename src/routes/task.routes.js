import {Router} from "express";
import {upload} from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    createTask,
    getTask,
    updateTask,
    deleteTask,
    getAllTasks,
    toggleTaskStatus
} from "../controllers/task.controller.js";


const router = Router()

router.route("/add")
  .post(verifyJWT, upload.single("attachment"), createTask);


router.route("/all")
  .get(verifyJWT, getAllTasks);


router.route("/:taskId")
  .get(verifyJWT, getTask)
  .patch(verifyJWT, upload.single("attachment"), updateTask)
  .delete(verifyJWT, deleteTask)
 
  
  router.route("/:taskId/status")
  .patch(verifyJWT, toggleTaskStatus) 

export default router