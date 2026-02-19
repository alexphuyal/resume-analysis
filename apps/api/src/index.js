require('dotenv').config()
const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const fileUpload = require('express-fileupload')
const path = require('path')

const resumeRoutes = require('./routes/resumes')
const { router: authRouter } = require('./routes/auth')
const scrapeRouter = require('./routes/scrape')

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors({ origin: 'http://localhost:3000', credentials: true }))
app.use(morgan('dev'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(fileUpload({
  limits: { fileSize: 5 * 1024 * 1024 },
  useTempFiles: false,   // Keep file in memory as file.data Buffer — no temp dir needed
}))

// Routes
app.use('/api/auth', authRouter)
app.use('/api/resumes', resumeRoutes)
app.use('/api/scrape', scrapeRouter)

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'resume-analysis-api', version: '2.0.0' })
})

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: err.message || 'Internal Server Error' })
})

app.listen(PORT, () => {
  console.log(`\n🚀 API Server running on http://localhost:${PORT}`)
  console.log(`📊 Database: ${process.env.DATABASE_URL?.split('@')[1] || 'connected'}`)
  console.log(`🤖 Groq AI: ${process.env.GROQ_API_KEY ? '✅ configured' : '⚠️  not set'}`)
})
