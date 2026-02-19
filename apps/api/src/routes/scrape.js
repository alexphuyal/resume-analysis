const express = require('express')
const router = express.Router()
const fetch = require('node-fetch')
const cheerio = require('cheerio')

// POST /api/scrape/job - Scrape job description from URL
router.post('/job', async (req, res) => {
  const { url } = req.body
  if (!url) return res.status(400).json({ error: 'URL is required' })

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 15000,
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const html = await response.text()
    const $ = cheerio.load(html)

    // Remove scripts, styles, nav, footer
    $('script, style, nav, footer, header, iframe, noscript, svg, img').remove()

    let jobDescription = ''
    const domain = new URL(url).hostname

    // Site-specific selectors
    if (domain.includes('linkedin.com')) {
      jobDescription = $('.jobs-description__content').text()
        || $('.job-description').text()
        || $('.description__text').text()
    } else if (domain.includes('indeed.com')) {
      jobDescription = $('#jobDescriptionText').text()
        || $('.jobsearch-jobDescriptionText').text()
    } else if (domain.includes('glassdoor.com')) {
      jobDescription = $('.jobDescriptionContent').text()
        || $('[class*="jobDescription"]').text()
    } else if (domain.includes('naukri.com')) {
      jobDescription = $('.job-desc').text()
        || $('[class*="job-desc"]').text()
    } else if (domain.includes('dice.com')) {
      jobDescription = $('[data-testid="jobDescriptionHtml"]').text()
    }

    // Generic fallback — look for common job description containers
    if (!jobDescription || jobDescription.trim().length < 100) {
      const selectors = [
        '[class*="job-description"]', '[class*="jobDescription"]',
        '[id*="job-description"]', '[id*="jobDescription"]',
        '[class*="description"]', 'article', 'main',
        '.posting-requirements', '.job-details', '[class*="details"]',
      ]
      for (const sel of selectors) {
        const text = $(sel).text().trim()
        if (text.length > 200) { jobDescription = text; break }
      }
    }

    // Last resort: body text
    if (!jobDescription || jobDescription.trim().length < 100) {
      jobDescription = $('body').text()
    }

    // Clean up
    jobDescription = jobDescription
      .replace(/\s{3,}/g, '\n\n')
      .replace(/\t/g, ' ')
      .trim()
      .slice(0, 6000) // limit chars

    if (jobDescription.length < 80) {
      return res.status(422).json({ error: 'Could not extract job description from this URL. Please paste it manually.' })
    }

    // Try to extract job title
    let jobTitle = $('h1').first().text().trim()
      || $('title').text().split('|')[0].trim()
      || ''

    res.json({ jobDescription, jobTitle, url, charCount: jobDescription.length })
  } catch (err) {
    console.error('Scrape error:', err.message)
    if (err.type === 'system' || err.message.includes('ENOTFOUND')) {
      return res.status(400).json({ error: 'Could not reach URL. Check the link and try again.' })
    }
    res.status(500).json({ error: 'Failed to fetch job description. Try pasting it manually.' })
  }
})

module.exports = router
