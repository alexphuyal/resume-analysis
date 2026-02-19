const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')
const axios = require('axios')

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'resumeai_secret_2024'
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000'

const signToken = (userId) => jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })

const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'No token provided' })
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.userId = decoded.userId
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' })
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return res.status(409).json({ error: 'Email already registered' })
    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({ data: { name, email, password: hashed }, select: { id: true, name: true, email: true, createdAt: true } })
    res.status(201).json({ user, token: signToken(user.id) })
  } catch (err) { console.error(err); res.status(500).json({ error: 'Registration failed' }) }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(401).json({ error: 'Invalid email or password' })
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' })
    res.json({ user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar }, token: signToken(user.id) })
  } catch (err) { console.error(err); res.status(500).json({ error: 'Login failed' }) }
})

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { id: true, name: true, email: true, avatar: true, createdAt: true } })
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json(user)
  } catch { res.status(500).json({ error: 'Failed to fetch profile' }) }
})

router.post('/google', async (req, res) => {
  try {
    const { accessToken } = req.body
    if (!accessToken) return res.status(400).json({ error: 'Access token required' })
    const { data: profile } = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } })
    const { email, name, picture } = profile
    if (!email) return res.status(400).json({ error: 'Could not get email from Google' })
    let user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      user = await prisma.user.create({ data: { name: name || email, email, password: '', avatar: picture || null } })
    } else if (!user.avatar && picture) {
      user = await prisma.user.update({ where: { id: user.id }, data: { avatar: picture } })
    }
    res.json({ user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar }, token: signToken(user.id) })
  } catch (err) { console.error('Google auth:', err.message); res.status(401).json({ error: 'Google authentication failed' }) }
})

router.post('/github', async (req, res) => {
  try {
    const { code } = req.body
    if (!code) return res.status(400).json({ error: 'GitHub code required' })
    const clientId = process.env.GITHUB_CLIENT_ID; const clientSecret = process.env.GITHUB_CLIENT_SECRET
    if (!clientId || !clientSecret) return res.status(400).json({ error: 'GitHub OAuth not configured' })
    const tokenRes = await axios.post('https://github.com/login/oauth/access_token', { client_id: clientId, client_secret: clientSecret, code }, { headers: { Accept: 'application/json' } })
    const ghToken = tokenRes.data.access_token
    if (!ghToken) return res.status(401).json({ error: 'GitHub token exchange failed' })
    const { data: ghUser } = await axios.get('https://api.github.com/user', { headers: { Authorization: `token ${ghToken}` } })
    let email = ghUser.email
    if (!email) {
      const { data: emails } = await axios.get('https://api.github.com/user/emails', { headers: { Authorization: `token ${ghToken}` } })
      email = emails.find(e => e.primary && e.verified)?.email
    }
    if (!email) return res.status(400).json({ error: 'Could not get email from GitHub' })
    let user = await prisma.user.findUnique({ where: { email } })
    if (!user) user = await prisma.user.create({ data: { name: ghUser.name || ghUser.login || email, email, password: '', avatar: ghUser.avatar_url || null } })
    res.json({ user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar }, token: signToken(user.id) })
  } catch (err) { console.error('GitHub auth:', err.message); res.status(401).json({ error: 'GitHub authentication failed' }) }
})

module.exports = { router, authMiddleware }
