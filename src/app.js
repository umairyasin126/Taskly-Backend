import express from 'express'
import cookieParser from "cookie-parser";
import cors from 'cors'
import mongoose from 'mongoose';


const app = express()


app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: "16kb"}))

app.use(express.static("public"))

app.use(cookieParser())

// routes import
import userRouter from './routes/user.routes.js';
import taskRouter from './routes/task.routes.js';

// routes declaration
app.use("/api/v1/users", userRouter)
app.use("/api/v1/tasks", taskRouter)

// health check
app.get('/api/v1/health', (_, res) => {
    const dbState = mongoose.connection.readyState;
    const dbStatus = dbState === 1 ? 'CONNECTED' : 'DISCONNECTED';
  
    res.status(dbState === 1 ? 200 : 503).json({
      status: dbState === 1 ? 'UP' : 'DOWN',
      database: dbStatus,
      timestamp: new Date().toISOString()
    });
  });



export default app
