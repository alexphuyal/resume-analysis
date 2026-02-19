const express = require('express')
const router = express.Router()
const { PrismaClient } = require('@prisma/client')
const axios = require('axios')
const FormData = require('form-data')
const fs = require('fs')
const path = require('path')
const { Readable } = require('stream')

const prisma = new PrismaClient()
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000'

// Directory to store uploaded resume files for viewing later
const UPLOADS_DIR = path.join(__dirname, '../../uploads')
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true })

// ── Text extraction (pure Node.js — no FastAPI needed) ────────────────────────
async function extractTextFromBuffer(buffer, filename) {
  const ext = filename.toLowerCase().split('.').pop()
  if (ext === 'pdf') {
    // pdf-parse v2+ class-based API: PDFParse({ data: Uint8Array, verbosity: 0 })
    // getText() returns { text: string, pages: [{text, num}], total, ... }
    const { PDFParse } = require('pdf-parse')
    const parser = new PDFParse({ data: new Uint8Array(buffer), verbosity: 0 })
    const result = await parser.getText()
    return (result && result.text) ? result.text : ''
  } else if (ext === 'docx' || ext === 'doc') {
    const mammoth = require('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return result.value || ''
  }
  return ''
}

// ── Shared AI prompt builder ──────────────────────────────────────────────────
function buildPrompt(resumeText, jobRole, jobDescription) {
  const jd = jobDescription
    ? `\n\nJob Description:\n${jobDescription.slice(0, 2500)}`
    : ''

  return `You are a world-class resume analyst and career coach with 15+ years in technical recruiting.
Analyze the following resume for a "${jobRole}" position and return a SINGLE valid JSON object. No markdown, no code blocks, just raw JSON.

Resume Text:
${resumeText.slice(0, 4000)}
${jd}

Return EXACTLY this JSON (all fields required, use real values from the resume — do NOT use placeholder text):
{
  "overall_score": <integer 0-100 based on actual resume quality>,
  "ats_score": <integer 0-100>,
  "content_score": <integer 0-100>,
  "keyword_score": <integer 0-100>,
  "format_score": <integer 0-100>,
  "impact_score": <integer 0-100>,
  "readability_score": <integer 0-100>,
  "skills_score": <integer 0-100>,
  "experience_score": <integer 0-100>,
  "summary": "<2-3 sentence executive summary of resume quality for ${jobRole} role, referencing actual content>",
  "skills": {
    "found": ["<actual skill from resume>", "<another skill>"],
    "missing": ["<critical skill for ${jobRole} NOT found in resume>"]
  },
  "keywords": {
    "matched": ["<keyword found in both resume and role requirements>"],
    "missing": ["<important keyword for this role missing from resume>"]
  },
  "suggestions": [
    {"type": "critical", "text": "<specific actionable improvement referencing actual resume content>"},
    {"type": "critical", "text": "<specific actionable improvement>"},
    {"type": "warning", "text": "<specific actionable improvement>"},
    {"type": "warning", "text": "<specific actionable improvement>"},
    {"type": "info", "text": "<specific actionable improvement>"},
    {"type": "info", "text": "<specific actionable improvement>"}
  ],
  "enhanced_bullets": [
    {"original": "<actual bullet from resume>", "improved": "<rewrite with strong action verb + metric + impact>"},
    {"original": "<actual bullet from resume>", "improved": "<rewrite with strong action verb + metric + impact>"},
    {"original": "<actual bullet from resume>", "improved": "<rewrite with strong action verb + metric + impact>"}
  ],
  "learning_resources": [
    {"skill": "<missing skill name>", "platform": "Coursera", "title": "<specific course title>", "url": "https://www.coursera.org/learn/example", "is_free": false},
    {"skill": "<missing skill name>", "platform": "YouTube", "title": "<specific video/playlist>", "url": "https://www.youtube.com/watch?v=example", "is_free": true},
    {"skill": "<missing skill name>", "platform": "freeCodeCamp", "title": "<specific tutorial>", "url": "https://www.freecodecamp.org/learn/example", "is_free": true},
    {"skill": "<missing skill name>", "platform": "Udemy", "title": "<specific course>", "url": "https://www.udemy.com/course/example", "is_free": false},
    {"skill": "<missing skill name>", "platform": "Google", "title": "<Google certificate or documentation>", "url": "https://developers.google.com/learn/example", "is_free": true}
  ]
}

IMPORTANT: Return ONLY the raw JSON object. No explanation. No markdown. No code fences.`
}

// ── Parse AI response (strips markdown fences) ────────────────────────────────
function parseAIResponse(raw) {
  let cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start !== -1 && end !== -1) cleaned = cleaned.slice(start, end + 1)
  return JSON.parse(cleaned)
}

// ── Gemini AI Analysis ────────────────────────────────────────────────────────
async function analyzeWithGemini(apiKey, resumeText, jobRole, jobDescription) {
  const prompt = buildPrompt(resumeText, jobRole, jobDescription)

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096,
        // NOTE: responseMimeType NOT set — gemini-2.5-flash is a thinking model
        // and does not support responseMimeType. parseAIResponse() strips fences.
      },
    },
    { headers: { 'Content-Type': 'application/json' }, timeout: 90000 }
  )

  const raw = response.data.candidates[0].content.parts[0].text.trim()
  return parseAIResponse(raw)
}

// ── Groq AI Analysis ─────────────────────────────────────────────────────────
async function analyzeWithGroq(apiKey, resumeText, jobRole, jobDescription) {
  const Groq = require('groq-sdk')
  const groq = new Groq({ apiKey })

  const prompt = buildPrompt(resumeText, jobRole, jobDescription)

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: 'You are a resume analysis expert. Always respond with valid JSON only, no markdown, no code fences.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.3,
    max_tokens: 4096,
  })

  const raw = completion.choices[0].message.content.trim()
  return parseAIResponse(raw)
}

// ── HuggingFace AI Analysis ───────────────────────────────────────────────────
async function analyzeWithHuggingFace(apiKey, resumeText, jobRole, jobDescription) {
  const prompt = buildPrompt(resumeText, jobRole, jobDescription)

  // Use HuggingFace Inference API with Mistral
  const response = await axios.post(
    'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3',
    {
      inputs: `<s>[INST] ${prompt} [/INST]`,
      parameters: {
        max_new_tokens: 4096,
        temperature: 0.3,
        return_full_text: false,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 120000,
    }
  )

  let raw = ''
  if (Array.isArray(response.data) && response.data[0]?.generated_text) {
    raw = response.data[0].generated_text.trim()
  } else if (response.data?.generated_text) {
    raw = response.data.generated_text.trim()
  } else {
    throw new Error('Unexpected HuggingFace response format')
  }

  return parseAIResponse(raw)
}

// ── AI provider dispatcher ────────────────────────────────────────────────────
async function runAIAnalysis(aiProvider, apiKey, resumeText, jobRole, jobDescription) {
  switch (aiProvider) {
    case 'groq':
      return { result: await analyzeWithGroq(apiKey, resumeText, jobRole, jobDescription), modelName: 'llama-3.3-70b-versatile (Groq)' }
    case 'huggingface':
      return { result: await analyzeWithHuggingFace(apiKey, resumeText, jobRole, jobDescription), modelName: 'Mistral-7B-Instruct (HuggingFace)' }
    case 'gemini':
    default:
      return { result: await analyzeWithGemini(apiKey, resumeText, jobRole, jobDescription), modelName: 'gemini-2.5-flash' }
  }
}

// ── POST /api/resumes/analyze ─────────────────────────────────────────────────
router.post('/analyze', async (req, res) => {
  let tempPath = null
  let savedFilePath = null

  try {
    if (!req.files || !req.files.resume)
      return res.status(400).json({ error: 'Resume file is required' })

    const { jobRole, jobDescription, geminiKey, groqKey, hfKey, aiProvider, userId, jobUrl } = req.body
    if (!jobRole) return res.status(400).json({ error: 'Job role is required' })

    // Determine which AI provider + key to use
    const provider = (aiProvider || 'gemini').toLowerCase()
    let apiKey
    if (provider === 'groq') {
      apiKey = groqKey || process.env.GROQ_API_KEY
      if (!apiKey) return res.status(400).json({ error: 'Groq API key is required. Enter it in the form above.' })
    } else if (provider === 'huggingface') {
      apiKey = hfKey || process.env.HF_API_KEY
      if (!apiKey) return res.status(400).json({ error: 'HuggingFace API key is required. Enter it in the form above.' })
    } else {
      apiKey = geminiKey || process.env.GEMINI_API_KEY
      if (!apiKey) return res.status(400).json({ error: 'Gemini API key is required. Enter it in the form above.' })
    }

    const file = req.files.resume
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    if (!allowed.includes(file.mimetype))
      return res.status(400).json({ error: 'Only PDF and Word documents are supported' })

    tempPath = file.tempFilePath

    // ── file.data is ALWAYS available as a Buffer from express-fileupload ────
    const fileBuffer = file.data && file.data.length > 0
      ? file.data
      : (tempPath && fs.existsSync(tempPath) ? fs.readFileSync(tempPath) : null)

    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({ error: 'File upload failed — received empty file.' })
    }
    console.log(`📄 File received: ${file.name} (${fileBuffer.length} bytes)`)

    // ── Step 1: Extract resume text ──────────────────────────────────────────
    let resumeText = ''

    // Try FastAPI first (best quality extraction) — stream from Buffer, no disk read
    try {
      const fd = new FormData()
      const readableStream = Readable.from(fileBuffer)
      fd.append('resume', readableStream, {
        filename: file.name,
        contentType: file.mimetype,
        knownLength: fileBuffer.length,
      })
      const extractRes = await axios.post(`${AI_SERVICE_URL}/extract`, fd, {
        headers: fd.getHeaders(),
        timeout: 15000,
      })
      resumeText = extractRes.data.text || ''
      console.log(`✅ FastAPI extracted ${resumeText.length} chars`)
    } catch (fastApiErr) {
      console.warn('⚠️  FastAPI not available, using Node.js extractor:', fastApiErr.message)
    }

    // Primary fallback: use pdf-parse / mammoth directly on the Buffer in memory
    if (!resumeText || resumeText.trim().length < 100) {
      try {
        resumeText = await extractTextFromBuffer(fileBuffer, file.name)
        resumeText = resumeText.replace(/\s+/g, ' ').trim()
        console.log(`✅ Node.js extracted ${resumeText.length} chars`)
      } catch (nodeExtractErr) {
        console.error('Node.js extraction failed:', nodeExtractErr.message)
      }
    }

    if (!resumeText || resumeText.trim().length < 50) {
      return res.status(422).json({
        error: 'Could not extract text from the resume file. Please ensure it is a text-based PDF or Word document (not a scanned image).',
      })
    }

    // ── Step 2: Save file for later viewing ──────────────────────────────────
    const resume = await prisma.resume.create({
      data: {
        fileName: file.name,
        fileSize: file.size,
        jobRole,
        jobDescription: jobDescription || null,
        jobUrl: jobUrl || null,
        userId: userId || null,
        status: 'PROCESSING',
      },
    })

    const fileExt = path.extname(file.name)
    savedFilePath = path.join(UPLOADS_DIR, `${resume.id}${fileExt}`)
    fs.writeFileSync(savedFilePath, fileBuffer)
    console.log(`📁 Saved file: ${savedFilePath}`)

    // ── Step 3: Run AI analysis ───────────────────────────────────────────────
    let aiResult, modelName
    try {
      const analysisResult = await runAIAnalysis(provider, apiKey, resumeText, jobRole, jobDescription)
      aiResult = analysisResult.result
      modelName = analysisResult.modelName
      console.log(`✅ ${modelName} analysis complete, score:`, aiResult.overall_score)
    } catch (aiErr) {
      console.error(`❌ AI analysis failed (${provider}):`, aiErr.response?.data || aiErr.message)
      await prisma.resume.update({ where: { id: resume.id }, data: { status: 'FAILED' } })

      // Provider-specific error messages
      let errMsg = 'AI analysis failed'
      if (provider === 'gemini') {
        const geminiError = aiErr.response?.data?.error
        if (geminiError?.status === 'INVALID_ARGUMENT') errMsg = 'Invalid Gemini API key format'
        else if (geminiError?.status === 'PERMISSION_DENIED') errMsg = 'Gemini API key is invalid or has no access. Get a free key at aistudio.google.com'
        else if (geminiError?.status === 'RESOURCE_EXHAUSTED') errMsg = 'Gemini API quota exceeded. Try again later or use a different key.'
        else if (geminiError?.message) errMsg = geminiError.message
        else if (aiErr.code === 'ECONNABORTED') errMsg = 'Gemini API timed out. Try again.'
      } else if (provider === 'groq') {
        const status = aiErr.status || aiErr.response?.status
        if (status === 401) errMsg = 'Invalid Groq API key. Get a free key at console.groq.com'
        else if (status === 429) errMsg = 'Groq rate limit exceeded. Try again in a moment.'
        else if (aiErr.code === 'ECONNABORTED') errMsg = 'Groq API timed out. Try again.'
        else errMsg = aiErr.message || 'Groq analysis failed'
      } else if (provider === 'huggingface') {
        const status = aiErr.response?.status
        if (status === 401) errMsg = 'Invalid HuggingFace API key. Get a free key at huggingface.co/settings/tokens'
        else if (status === 503) errMsg = 'HuggingFace model is loading. Try again in ~30 seconds.'
        else if (status === 429) errMsg = 'HuggingFace rate limit exceeded. Try again later.'
        else if (aiErr.code === 'ECONNABORTED') errMsg = 'HuggingFace API timed out. The model may be loading — try again.'
        else errMsg = aiErr.response?.data?.error || aiErr.message || 'HuggingFace analysis failed'
      }

      return res.status(500).json({ error: errMsg })
    }

    const skillsFound = Array.isArray(aiResult.skills?.found) ? aiResult.skills.found : []
    const skillsMissing = Array.isArray(aiResult.skills?.missing) ? aiResult.skills.missing : []
    const kwMatched = Array.isArray(aiResult.keywords?.matched) ? aiResult.keywords.matched : []
    const kwMissing = Array.isArray(aiResult.keywords?.missing) ? aiResult.keywords.missing : []
    const suggestions = Array.isArray(aiResult.suggestions) ? aiResult.suggestions : []
    const learningResources = Array.isArray(aiResult.learning_resources) ? aiResult.learning_resources : []
    const enhancedBullets = Array.isArray(aiResult.enhanced_bullets) ? aiResult.enhanced_bullets : []

    // ── Step 4: Save full result to DB ───────────────────────────────────────
    await prisma.resume.update({
      where: { id: resume.id },
      data: {
        overallScore:    Math.min(100, Math.max(0, Math.round(Number(aiResult.overall_score)    || 70))),
        atsScore:        Math.min(100, Math.max(0, Math.round(Number(aiResult.ats_score)        || 70))),
        contentScore:    Math.min(100, Math.max(0, Math.round(Number(aiResult.content_score)    || 70))),
        keywordScore:    Math.min(100, Math.max(0, Math.round(Number(aiResult.keyword_score)    || 70))),
        formatScore:     Math.min(100, Math.max(0, Math.round(Number(aiResult.format_score)     || 70))),
        impactScore:     Math.min(100, Math.max(0, Math.round(Number(aiResult.impact_score)     || 60))),
        readabilityScore:Math.min(100, Math.max(0, Math.round(Number(aiResult.readability_score)|| 75))),
        skillsScore:     Math.min(100, Math.max(0, Math.round(Number(aiResult.skills_score)     || 70))),
        experienceScore: Math.min(100, Math.max(0, Math.round(Number(aiResult.experience_score) || 70))),
        rawText:         resumeText.slice(0, 15000),
        summary:         String(aiResult.summary || ''),
        enhancedBullets: JSON.stringify(enhancedBullets),
        aiModel:         modelName,
        status:          'COMPLETED',
        skills: {
          create: [
            ...skillsFound.map(s => ({ name: String(s), type: 'FOUND' })),
            ...skillsMissing.map(s => ({ name: String(s), type: 'MISSING' })),
          ],
        },
        keywords: {
          create: [
            ...kwMatched.map(k => ({ word: String(k), type: 'MATCHED' })),
            ...kwMissing.map(k => ({ word: String(k), type: 'MISSING' })),
          ],
        },
        suggestions: {
          create: suggestions.map((s, i) => ({
            type: (s.type || 'info').toUpperCase(),
            text: String(s.text || ''),
            priority: i,
          })),
        },
        learningResources: {
          create: learningResources.map(r => ({
            skill:    String(r.skill    || ''),
            platform: String(r.platform || 'Online'),
            title:    String(r.title    || ''),
            url:      String(r.url      || '#'),
            isFree:   Boolean(r.is_free ?? true),
          })),
        },
      },
    })

    // Clean up temp file
    if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath)

    res.json({ id: resume.id, message: 'Analysis complete' })
  } catch (error) {
    console.error('❌ Analyze route error:', error)
    if (tempPath && fs.existsSync(tempPath)) { try { fs.unlinkSync(tempPath) } catch {} }
    res.status(500).json({ error: 'Analysis failed', detail: error.message })
  }
})

// ── GET /api/resumes/:id/file — serve stored resume file ─────────────────────
router.get('/:id/file', async (req, res) => {
  try {
    const resume = await prisma.resume.findUnique({
      where: { id: req.params.id },
      select: { fileName: true },
    })
    if (!resume) return res.status(404).json({ error: 'Resume not found' })

    const ext = path.extname(resume.fileName)
    const filePath = path.join(UPLOADS_DIR, `${req.params.id}${ext}`)

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not available. It may have been submitted before file storage was enabled.' })
    }

    const mimeTypes = {
      '.pdf':  'application/pdf',
      '.doc':  'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream')
    res.setHeader('Content-Disposition', `inline; filename="${resume.fileName}"`)
    fs.createReadStream(filePath).pipe(res)
  } catch (error) {
    res.status(500).json({ error: 'Failed to serve file' })
  }
})

// ── GET /api/resumes/:id — full result ────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const resume = await prisma.resume.findUnique({
      where: { id: req.params.id },
      include: {
        skills: true,
        keywords: true,
        suggestions: { orderBy: { priority: 'asc' } },
        learningResources: true,
      },
    })
    if (!resume) return res.status(404).json({ error: 'Resume not found' })

    const ext = path.extname(resume.fileName)
    const filePath = path.join(UPLOADS_DIR, `${resume.id}${ext}`)
    const hasFile = fs.existsSync(filePath)

    res.json({
      id: resume.id,
      fileName: resume.fileName,
      fileSize: resume.fileSize,
      jobRole: resume.jobRole,
      jobUrl: resume.jobUrl,
      overallScore: resume.overallScore,
      atsScore: resume.atsScore,
      contentScore: resume.contentScore,
      keywordScore: resume.keywordScore,
      formatScore: resume.formatScore,
      impactScore: resume.impactScore,
      readabilityScore: resume.readabilityScore,
      skillsScore: resume.skillsScore,
      experienceScore: resume.experienceScore,
      summary: resume.summary,
      rawText: resume.rawText,
      aiModel: resume.aiModel,
      status: resume.status,
      createdAt: resume.createdAt,
      hasFile,
      enhancedBullets: resume.enhancedBullets ? JSON.parse(resume.enhancedBullets) : [],
      skills: {
        found:   resume.skills.filter(s => s.type === 'FOUND').map(s => s.name),
        missing: resume.skills.filter(s => s.type === 'MISSING').map(s => s.name),
      },
      keywords: {
        matched: resume.keywords.filter(k => k.type === 'MATCHED').map(k => k.word),
        missing: resume.keywords.filter(k => k.type === 'MISSING').map(k => k.word),
      },
      suggestions: resume.suggestions.map(s => ({ type: s.type.toLowerCase(), text: s.text })),
      learningResources: resume.learningResources.map(r => ({
        skill: r.skill, platform: r.platform, title: r.title, url: r.url, isFree: r.isFree,
      })),
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch result' })
  }
})

// ── GET /api/resumes — list ───────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query
    const resumes = await prisma.resume.findMany({
      where: userId ? { userId } : {},
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, fileName: true, jobRole: true,
        overallScore: true, atsScore: true,
        contentScore: true, keywordScore: true, formatScore: true,
        impactScore: true, skillsScore: true,
        status: true, createdAt: true,
      },
    })
    res.json(resumes)
  } catch {
    res.status(500).json({ error: 'Failed to fetch history' })
  }
})

// ── DELETE /api/resumes/:id ───────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const resume = await prisma.resume.findUnique({
      where: { id: req.params.id },
      select: { fileName: true },
    })
    if (resume) {
      const ext = path.extname(resume.fileName)
      const filePath = path.join(UPLOADS_DIR, `${req.params.id}${ext}`)
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    }
    await prisma.resume.delete({ where: { id: req.params.id } })
    res.json({ message: 'Deleted' })
  } catch {
    res.status(500).json({ error: 'Delete failed' })
  }
})

module.exports = router
