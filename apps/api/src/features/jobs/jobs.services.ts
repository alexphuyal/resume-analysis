import fs from "fs";
import { ApplicationException } from "../../common/errors/application-exception";
import { prisma } from "../../lib/prisma";
import { resumeService } from "../resumes/resumes.service";

export interface Job {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  type: "full-time" | "part-time" | "internship" | "contract" | "remote";
  remote: boolean;
  salary?: string;
  description: string;
  applyUrl: string;
  postedAt: string;
  tags: string[];
  experience?: string;
}

export interface JobListQuery {
  query?: string;
  location?: string;
  type?: string;
  remote?: string;
  page?: string;
  limit?: string;
  skills?: string;
}

interface MatchInsights {
  score: number;
  level: "strong" | "good" | "fair" | "weak";
  summary: string;
  resume: {
    id: string;
    fileName: string;
    overallScore: number;
    analyzedAt: string;
    jobRole: string;
  };
  matchedSkills: string[];
  missingSkills: string[];
  matchedKeywords: string[];
  missingKeywords: string[];
  strengths: string[];
  improvements: string[];
}

const STOP_WORDS = new Set([
  "about",
  "across",
  "after",
  "also",
  "and",
  "are",
  "build",
  "building",
  "for",
  "from",
  "have",
  "into",
  "join",
  "next",
  "our",
  "that",
  "the",
  "their",
  "them",
  "this",
  "using",
  "with",
  "work",
  "your",
]);

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const unique = <T>(items: T[]): T[] => Array.from(new Set(items));

const tokenize = (value: string): string[] =>
  normalize(value)
    .split(" ")
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));

const hasTerm = (haystack: string, needle: string): boolean => {
  const normalizedNeedle = normalize(needle);
  if (!normalizedNeedle) return false;

  return haystack.includes(normalizedNeedle);
};

const getTopKeywords = (job: Job): string[] => {
  const titleTokens = tokenize(job.title);
  const descriptionTokens = tokenize(job.description);
  const ranked = new Map<string, number>();

  [...titleTokens, ...job.tags.map(normalize), ...descriptionTokens].forEach(
    (token, index) => {
      const weight =
        index < titleTokens.length
          ? 3
          : index < titleTokens.length + job.tags.length
            ? 4
            : 1;
      ranked.set(token, (ranked.get(token) || 0) + weight);
    },
  );

  return [...ranked.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([token]) => token);
};

const getMatchLevel = (score: number): MatchInsights["level"] => {
  if (score >= 80) return "strong";
  if (score >= 65) return "good";
  if (score >= 50) return "fair";
  return "weak";
};

const buildSummary = (
  level: MatchInsights["level"],
  matchedSkills: string[],
  missingSkills: string[],
): string => {
  if (level === "strong") {
    return `Strong fit. Your resume already covers ${matchedSkills.length} priority skills for this role.`;
  }

  if (level === "good") {
    return `Good fit. You match several core requirements, with a few skill gaps to close.`;
  }

  if (level === "fair") {
    return `Partial fit. You have some relevant overlap, but the role asks for additional emphasis or missing skills.`;
  }

  if (missingSkills.length > 0) {
    return `Low fit right now. This role expects skills like ${missingSkills.slice(0, 2).join(", ")} that are not yet visible in your resume.`;
  }

  return "Low fit right now. Your resume needs stronger evidence for this role.";
};

// ─── Rich mock dataset ────────────────────────────────────────────────────────
const MOCK_JOBS: Job[] = [
  {
    id: "j1",
    title: "Frontend Engineer",
    company: "Google",
    location: "Bangalore, India",
    type: "full-time",
    remote: true,
    salary: "₹25–40 LPA",
    description:
      "Build and scale next-generation web products used by billions. Collaborate with design and product teams to ship pixel-perfect experiences using React, TypeScript and modern web APIs.",
    applyUrl: "https://careers.google.com",
    postedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    tags: ["React", "TypeScript", "Next.js", "GraphQL"],
    experience: "2–5 years",
  },
  {
    id: "j2",
    title: "Backend Engineer – Node.js",
    company: "Swiggy",
    location: "Bangalore, India",
    type: "full-time",
    remote: false,
    salary: "₹18–30 LPA",
    description:
      "Design and maintain high-throughput microservices handling millions of food orders daily. Deep work in distributed systems, caching, and message queues.",
    applyUrl: "https://swiggy.com/careers",
    postedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    tags: ["Node.js", "TypeScript", "PostgreSQL", "Kafka", "Redis"],
    experience: "3–6 years",
  },
  {
    id: "j3",
    title: "ML Engineer – NLP",
    company: "Sarvam AI",
    location: "Mumbai, India",
    type: "full-time",
    remote: true,
    salary: "₹30–55 LPA",
    description:
      "Work on Indian-language LLMs. Fine-tune transformer models, build embeddings, and deploy inference pipelines at scale for speech and text in 10+ Indian languages.",
    applyUrl: "https://sarvam.ai/careers",
    postedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    tags: ["Python", "PyTorch", "HuggingFace", "FastAPI", "NLP"],
    experience: "2–4 years",
  },
  {
    id: "j4",
    title: "Software Engineering Intern",
    company: "Zepto",
    location: "Mumbai, India",
    type: "internship",
    remote: false,
    salary: "₹60,000/month",
    description:
      "6-month hands-on internship building features in Zepto's rapid-delivery platform. Work directly with senior engineers on real production code.",
    applyUrl: "https://zepto.com/careers",
    postedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    tags: ["React", "Node.js", "Python", "SQL"],
    experience: "0–1 year",
  },
  {
    id: "j5",
    title: "DevOps / Platform Engineer",
    company: "Razorpay",
    location: "Bangalore, India",
    type: "full-time",
    remote: true,
    salary: "₹22–38 LPA",
    description:
      "Own the cloud infrastructure powering India's leading payments platform. Work on Kubernetes, Terraform, CI/CD pipelines, and observability stacks at scale.",
    applyUrl: "https://razorpay.com/jobs",
    postedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    tags: ["Kubernetes", "Terraform", "AWS", "Docker", "Prometheus"],
    experience: "3–7 years",
  },
  {
    id: "j6",
    title: "Data Scientist",
    company: "PhonePe",
    location: "Bangalore, India",
    type: "full-time",
    remote: false,
    salary: "₹20–35 LPA",
    description:
      "Build ML models for fraud detection, credit scoring, and personalization. End-to-end ownership from EDA to production deployment with 100M+ users at stake.",
    applyUrl: "https://phonepe.com/careers",
    postedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    tags: ["Python", "Scikit-learn", "Spark", "SQL", "MLflow"],
    experience: "2–5 years",
  },
  {
    id: "j7",
    title: "Full Stack Developer Intern",
    company: "Cred",
    location: "Bangalore, India",
    type: "internship",
    remote: true,
    salary: "₹50,000/month",
    description:
      "Join CRED's engineering team as an intern. Build consumer-facing features for India's most design-obsessed fintech app. Mentored by senior engineers.",
    applyUrl: "https://cred.club/careers",
    postedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    tags: ["React", "Node.js", "TypeScript", "PostgreSQL"],
    experience: "0–1 year",
  },
  {
    id: "j8",
    title: "Cloud Solutions Architect",
    company: "Microsoft",
    location: "Hyderabad, India",
    type: "full-time",
    remote: true,
    salary: "₹35–60 LPA",
    description:
      "Help enterprise customers design and migrate to Azure cloud. Deep expertise in Azure services, solution design, and customer-facing technical leadership.",
    applyUrl: "https://careers.microsoft.com",
    postedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    tags: ["Azure", "Kubernetes", "Terraform", "Python", ".NET"],
    experience: "5–10 years",
  },
  {
    id: "j9",
    title: "Product Manager – Growth",
    company: "Meesho",
    location: "Bangalore, India",
    type: "full-time",
    remote: false,
    salary: "₹25–45 LPA",
    description:
      "Drive user acquisition and retention strategies for Meesho's 140M+ social commerce users. Work cross-functionally with design, engineering and data science.",
    applyUrl: "https://meesho.io/jobs",
    postedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    tags: ["Product", "Analytics", "A/B Testing", "SQL"],
    experience: "3–6 years",
  },
  {
    id: "j10",
    title: "iOS Engineer",
    company: "Zomato",
    location: "Gurgaon, India",
    type: "full-time",
    remote: true,
    salary: "₹22–40 LPA",
    description:
      "Build the next version of Zomato's iOS app used by 80M+ users. Swift, SwiftUI, performance optimization, and seamless micro-interactions.",
    applyUrl: "https://zomato.com/careers",
    postedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    tags: ["Swift", "SwiftUI", "iOS", "Objective-C", "CI/CD"],
    experience: "2–5 years",
  },
  {
    id: "j11",
    title: "Cybersecurity Analyst",
    company: "Infosys",
    location: "Pune, India",
    type: "full-time",
    remote: false,
    salary: "₹8–18 LPA",
    description:
      "Monitor, detect, and respond to security incidents. Conduct vulnerability assessments, penetration testing and SIEM event analysis for enterprise clients.",
    applyUrl: "https://infosys.com/careers",
    postedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    tags: ["SIEM", "Penetration Testing", "Python", "Wireshark", "Linux"],
    experience: "1–3 years",
  },
  {
    id: "j12",
    title: "Research Intern – AI/ML",
    company: "IIT Bombay (IITB)",
    location: "Mumbai, India",
    type: "internship",
    remote: false,
    salary: "₹25,000/month",
    description:
      "Work with IITB research labs on computer vision and NLP projects. Publish papers, build prototypes, and collaborate with PhD students and faculty.",
    applyUrl: "https://iitb.ac.in/jobs",
    postedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    tags: ["Python", "PyTorch", "Computer Vision", "Research", "NLP"],
    experience: "0–1 year",
  },
  {
    id: "j13",
    title: "React Native Developer",
    company: "Groww",
    location: "Bangalore, India",
    type: "full-time",
    remote: true,
    salary: "₹18–32 LPA",
    description:
      "Build and scale Groww's investment app used by 10M+ users. Cross-platform mobile development with React Native, performance tuning, and seamless financial UX.",
    applyUrl: "https://groww.in/careers",
    postedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    tags: ["React Native", "TypeScript", "Redux", "iOS", "Android"],
    experience: "2–4 years",
  },
  {
    id: "j14",
    title: "UX Designer",
    company: "Figma",
    location: "Remote",
    type: "full-time",
    remote: true,
    salary: "$120K–$160K",
    description:
      "Design new features for Figma's design platform used by millions. Collaborate with PMs and engineers, run user research, and ship delightful interactions.",
    applyUrl: "https://figma.com/careers",
    postedAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    tags: ["Figma", "Design Systems", "Prototyping", "User Research"],
    experience: "3–6 years",
  },
  {
    id: "j15",
    title: "Backend Intern – Python",
    company: "Jupiter Money",
    location: "Bangalore, India",
    type: "internship",
    remote: false,
    salary: "₹40,000/month",
    description:
      "Build APIs, data pipelines and microservices powering Jupiter's neobank. Learn from senior engineers shipping production Python / FastAPI services.",
    applyUrl: "https://jupiter.money/careers",
    postedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    tags: ["Python", "FastAPI", "PostgreSQL", "Redis", "Docker"],
    experience: "0–1 year",
  },
];

// ─── Filter + paginate ────────────────────────────────────────────────────────
export function getJobs(query: JobListQuery) {
  const {
    query: q,
    location,
    type,
    remote,
    skills,
    page = "1",
    limit = "10",
  } = query;

  let jobs = [...MOCK_JOBS];

  // Keyword search (title, company, tags, description)
  if (q) {
    const lc = q.toLowerCase();
    jobs = jobs.filter(
      (j) =>
        j.title.toLowerCase().includes(lc) ||
        j.company.toLowerCase().includes(lc) ||
        j.tags.some((t) => t.toLowerCase().includes(lc)) ||
        j.description.toLowerCase().includes(lc),
    );
  }

  // Location filter
  if (location) {
    const lc = location.toLowerCase();
    jobs = jobs.filter(
      (j) =>
        j.location.toLowerCase().includes(lc) || (j.remote && lc === "remote"),
    );
  }

  // Job type filter
  if (type && type !== "all") {
    jobs = jobs.filter((j) => j.type === type);
  }

  // Remote filter
  if (remote === "true") {
    jobs = jobs.filter((j) => j.remote);
  }

  // Skills filter (comma-separated)
  if (skills) {
    const skillList = skills
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (skillList.length) {
      jobs = jobs.filter((j) =>
        skillList.some((sk) =>
          j.tags.some((t) => t.toLowerCase().includes(sk)),
        ),
      );
    }
  }

  const totalCount = jobs.length;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
  const start = (pageNum - 1) * limitNum;
  const paginated = jobs.slice(start, start + limitNum);

  return {
    jobs: paginated,
    total: totalCount,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(totalCount / limitNum),
  };
}

export function getJobById(id: string): Job | undefined {
  return MOCK_JOBS.find((j) => j.id === id);
}

export async function getJobMatch(
  userId: string,
  jobId: string,
): Promise<MatchInsights> {
  const job = getJobById(jobId);

  if (!job) {
    throw new ApplicationException("Job not found", 404, "JOB_NOT_FOUND");
  }

  const resume = await prisma.resume.findFirst({
    where: {
      userId,
      status: "COMPLETED",
    },
    orderBy: { createdAt: "desc" },
    include: {
      skills: true,
      keywords: true,
    },
  });

  if (!resume) {
    throw new ApplicationException(
      "Analyze a resume first to calculate job match",
      404,
      "NO_COMPLETED_RESUME",
    );
  }

  const normalizedResumeText = normalize(
    [
      resume.rawText || "",
      resume.jobRole,
      ...resume.skills.map((skill) => skill.name),
      ...resume.keywords.map((keyword) => keyword.word),
    ].join(" "),
  );

  const resumeSignals = unique(
    [
      ...resume.skills
        .filter((skill) => skill.type === "FOUND")
        .map((skill) => skill.name),
      ...resume.keywords
        .filter((keyword) => keyword.type === "MATCHED")
        .map((keyword) => keyword.word),
    ].filter(Boolean),
  );

  const matchedSkills = job.tags.filter(
    (tag) =>
      resumeSignals.some((signal) => normalize(signal) === normalize(tag)) ||
      hasTerm(normalizedResumeText, tag),
  );
  const missingSkills = job.tags.filter(
    (tag) =>
      !matchedSkills.some((matched) => normalize(matched) === normalize(tag)),
  );

  const jobKeywords = getTopKeywords(job);
  const matchedKeywords = jobKeywords.filter((keyword) =>
    hasTerm(normalizedResumeText, keyword),
  );
  const missingKeywords = jobKeywords.filter(
    (keyword) => !matchedKeywords.includes(keyword),
  );

  const titleTokens = tokenize(job.title);
  const resumeRoleTokens = tokenize(resume.jobRole || "");
  const roleOverlap = titleTokens.filter(
    (token) =>
      resumeRoleTokens.includes(token) || hasTerm(normalizedResumeText, token),
  ).length;

  const tagCoverage =
    job.tags.length > 0 ? matchedSkills.length / job.tags.length : 0.5;
  const keywordCoverage =
    jobKeywords.length > 0 ? matchedKeywords.length / jobKeywords.length : 0.5;
  const roleCoverage =
    titleTokens.length > 0 ? roleOverlap / titleTokens.length : 0.5;
  const resumeQuality = (resume.overallScore || 0) / 100;

  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        tagCoverage * 45 +
          keywordCoverage * 20 +
          roleCoverage * 15 +
          resumeQuality * 20,
      ),
    ),
  );

  const strengths: string[] = [];
  const improvements: string[] = [];

  if (matchedSkills.length > 0) {
    strengths.push(
      `Your resume already shows ${matchedSkills.length} of ${job.tags.length} highlighted job skills.`,
    );
  }

  if (roleOverlap > 0) {
    strengths.push(
      `Your recent target role overlaps with this job title, which helps ATS alignment.`,
    );
  }

  if (resume.overallScore >= 75) {
    strengths.push(
      `Your latest resume quality score is ${resume.overallScore}, which gives this application a solid baseline.`,
    );
  }

  if (missingSkills.length > 0) {
    improvements.push(
      `Add stronger evidence for ${missingSkills.slice(0, 3).join(", ")} in your experience bullets or skills section.`,
    );
  }

  if (missingKeywords.length > 0) {
    improvements.push(
      `Mirror the job language more closely by incorporating keywords like ${missingKeywords.slice(0, 3).join(", ")} where they are truthful.`,
    );
  }

  if (resume.overallScore < 70) {
    improvements.push(
      `Improve the resume’s general ATS quality first, since your latest overall score is ${resume.overallScore}.`,
    );
  }

  const level = getMatchLevel(score);

  return {
    score,
    level,
    summary: buildSummary(level, matchedSkills, missingSkills),
    resume: {
      id: resume.id,
      fileName: resume.fileName,
      overallScore: resume.overallScore,
      analyzedAt: resume.createdAt.toISOString(),
      jobRole: resume.jobRole,
    },
    matchedSkills,
    missingSkills,
    matchedKeywords,
    missingKeywords,
    strengths: strengths.slice(0, 3),
    improvements: improvements.slice(0, 3),
  };
}

export async function analyzeResumeForJob(
  userId: string,
  jobId: string,
  file: Express.Multer.File,
): Promise<MatchInsights> {
  const job = getJobById(jobId);

  if (!job) {
    throw new ApplicationException("Job not found", 404, "JOB_NOT_FOUND");
  }

  // Read the uploaded resume content from either memory or disk
  const fileBuffer =
    file.buffer ||
    (file.path && fs.existsSync(file.path) ? fs.readFileSync(file.path) : null);

  if (!fileBuffer || fileBuffer.length === 0) {
    throw new ApplicationException(
      "Could not read uploaded resume file.",
      400,
      "RESUME_FILE_READ_FAILED",
    );
  }

  const resumeText = await resumeService.extractTextFromBuffer(
    fileBuffer,
    file.originalname,
  );
  if (!resumeText.trim()) {
    throw new ApplicationException(
      "Could not extract text from resume file",
      400,
      "TEXT_EXTRACTION_FAILED",
    );
  }

  // For now, we'll use a simple analysis without AI to avoid requiring API keys
  // In a full implementation, you'd call the AI service here
  const normalizedResumeText = normalize(resumeText);
  const resumeSignals = unique(tokenize(resumeText));

  const matchedSkills = job.tags.filter(
    (tag) =>
      resumeSignals.some((signal) => normalize(signal) === normalize(tag)) ||
      hasTerm(normalizedResumeText, tag),
  );
  const missingSkills = job.tags.filter(
    (tag) =>
      !matchedSkills.some((matched) => normalize(matched) === normalize(tag)),
  );

  const jobKeywords = getTopKeywords(job);
  const matchedKeywords = jobKeywords.filter((keyword) =>
    hasTerm(normalizedResumeText, keyword),
  );
  const missingKeywords = jobKeywords.filter(
    (keyword) => !matchedKeywords.includes(keyword),
  );

  const titleTokens = tokenize(job.title);
  const roleOverlap = titleTokens.filter(
    (token) =>
      resumeSignals.includes(token) || hasTerm(normalizedResumeText, token),
  ).length;

  const tagCoverage =
    job.tags.length > 0 ? matchedSkills.length / job.tags.length : 0.5;
  const keywordCoverage =
    jobKeywords.length > 0 ? matchedKeywords.length / jobKeywords.length : 0.5;
  const roleCoverage =
    titleTokens.length > 0 ? roleOverlap / titleTokens.length : 0.5;

  // Estimate resume quality based on text length and structure
  const resumeQuality = Math.min(1, Math.max(0.3, resumeText.length / 2000));

  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        tagCoverage * 45 +
          keywordCoverage * 20 +
          roleCoverage * 15 +
          resumeQuality * 20,
      ),
    ),
  );

  const strengths: string[] = [];
  const improvements: string[] = [];

  if (matchedSkills.length > 0) {
    strengths.push(
      `Your resume shows ${matchedSkills.length} of ${job.tags.length} key job skills.`,
    );
  }

  if (roleOverlap > 0) {
    strengths.push(`Resume content aligns with the job title requirements.`);
  }

  if (resumeText.length > 1000) {
    strengths.push(`Resume has substantial content and detail.`);
  }

  if (missingSkills.length > 0) {
    improvements.push(
      `Add evidence for ${missingSkills.slice(0, 3).join(", ")} in your experience or skills.`,
    );
  }

  if (missingKeywords.length > 0) {
    improvements.push(
      `Incorporate keywords like ${missingKeywords.slice(0, 3).join(", ")} where relevant.`,
    );
  }

  if (resumeText.length < 500) {
    improvements.push(
      `Expand your resume with more detailed descriptions of your experience and achievements.`,
    );
  }

  const level = getMatchLevel(score);

  return {
    score,
    level,
    summary: buildSummary(level, matchedSkills, missingSkills),
    resume: {
      id: "temp-" + Date.now(),
      fileName: file.originalname,
      overallScore: Math.round(score),
      analyzedAt: new Date().toISOString(),
      jobRole: job.title,
    },
    matchedSkills,
    missingSkills,
    matchedKeywords,
    missingKeywords,
    strengths: strengths.slice(0, 3),
    improvements: improvements.slice(0, 3),
  };
}
