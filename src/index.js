import app from "./app.js";
import connectDB from "./db/index.js"
import dotenv from "dotenv"

dotenv.config({
    path: './.env'
})

connectDB()
    .then(() => {
        const PORT = process.env.PORT || 8000

        app.on("error", (error) => {
            console.log("ERROR", error);
            throw error
        })

        app.listen(PORT, () => {
            console.log(`Server is running at port: ${PORT}`);
        })

    })
    .catch((err) => {
        console.log("MONGO db connection failed!!!")
    })