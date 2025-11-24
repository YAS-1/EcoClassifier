import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { connectDB } from './config/db.js'

import Uploadrouter from './routes/upload.routes.js'
import Eventrouter from './routes/events.routes.js'
import { urlencoded } from 'express'

dotenv.config()

const app = express()

app.use(express.json())
app.use(cors())
app.use(cookieParser())
app.use(urlencoded({ extended: true }))

const port = process.env.PORT || 5000

// api connections
app.use('/api', Uploadrouter)
app.use('/api', Eventrouter)

// Connect DB first, then start server
connectDB().then(() => {
    app.listen(port, () => {
        console.log(`Server running on port ${port}`)
    })
}).catch((err) => {
    console.error("Failed to connect database", err)
    process.exit(1)
})