import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { connectDB } from './config/db.js'

dotenv.config()

const app = express()

app.use(express.json())
app.use(cors())
app.use(cookieParser())

const port = process.env.PORT || 5000

// Connect DB first, then start server
connectDB().then(() => {
    app.listen(port, () => {
        console.log(`Server running on port ${port}`)
    })
}).catch((err) => {
    console.error("Failed to connect database", err)
    process.exit(1)
})