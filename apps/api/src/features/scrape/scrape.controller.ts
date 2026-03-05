import { Request, Response } from 'express';
import cheerio from 'cheerio';
import fetch from 'node-fetch';
import { Result } from '../../common/http/result';

export const scrapeController = {
  /**
   * @description Scrape and normalize a job description from a job posting URL.
   * @input req.body: { url: string }
   * @returns 200 with extracted jobDescription/jobTitle metadata, or an error response.
   */
  async scrapeJob(req: Request, res: Response): Promise<void> {
    const { url } = req.body as { url: string };

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 15000,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const html = await response.text();
      const $ = cheerio.load(html);

      $('script, style, nav, footer, header, iframe, noscript, svg, img').remove();

      let jobDescription = '';
      const domain = new URL(url).hostname;

      if (domain.includes('linkedin.com')) {
        jobDescription = $('.jobs-description__content').text() || $('.job-description').text() || $('.description__text').text();
      } else if (domain.includes('indeed.com')) {
        jobDescription = $('#jobDescriptionText').text() || $('.jobsearch-jobDescriptionText').text();
      } else if (domain.includes('glassdoor.com')) {
        jobDescription = $('.jobDescriptionContent').text() || $('[class*="jobDescription"]').text();
      } else if (domain.includes('naukri.com')) {
        jobDescription = $('.job-desc').text() || $('[class*="job-desc"]').text();
      } else if (domain.includes('dice.com')) {
        jobDescription = $('[data-testid="jobDescriptionHtml"]').text();
      }

      if (!jobDescription || jobDescription.trim().length < 100) {
        const selectors = [
          '[class*="job-description"]',
          '[class*="jobDescription"]',
          '[id*="job-description"]',
          '[id*="jobDescription"]',
          '[class*="description"]',
          'article',
          'main',
          '.posting-requirements',
          '.job-details',
          '[class*="details"]',
        ];

        for (const selector of selectors) {
          const text = $(selector).text().trim();
          if (text.length > 200) {
            jobDescription = text;
            break;
          }
        }
      }

      if (!jobDescription || jobDescription.trim().length < 100) {
        jobDescription = $('body').text();
      }

      jobDescription = jobDescription
        .replace(/\s{3,}/g, '\n\n')
        .replace(/\t/g, ' ')
        .trim()
        .slice(0, 6000);

      if (jobDescription.length < 80) {
        res.status(422).json(Result.fail('Could not extract job description from this URL. Please paste it manually.', 'SCRAPE_INSUFFICIENT_CONTENT'));
        return;
      }

      const jobTitle = $('h1').first().text().trim() || $('title').text().split('|')[0].trim() || '';
      res.json(Result.ok('Job description extracted successfully', { jobDescription, jobTitle, url, charCount: jobDescription.length }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';

      if (message.includes('ENOTFOUND')) {
        res.status(400).json(Result.fail('Could not reach URL. Check the link and try again.', 'SCRAPE_HOST_UNREACHABLE'));
        return;
      }

      res.status(500).json(Result.fail('Failed to fetch job description. Try pasting it manually.', 'SCRAPE_FAILED'));
    }
  },
};
