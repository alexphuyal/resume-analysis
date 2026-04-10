import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import {
  Search,
  MapPin,
  Briefcase,
  Wifi,
  X,
  ChevronRight,
  ExternalLink,
  Loader2,
  Building2,
  Clock,
  Tag,
  Filter,
  RotateCcw,
  Zap,
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  SlidersHorizontal,
  TrendingUp,
  Upload,
  FileText,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";

// ─── Constants ────────────────────────────────────────────────────────────────
const JOB_TYPES = [
  { value: "all", label: "All Types", icon: "🗂️" },
  { value: "full-time", label: "Full-Time", icon: "💼" },
  { value: "internship", label: "Internship", icon: "🎓" },
  { value: "part-time", label: "Part-Time", icon: "⏰" },
  { value: "contract", label: "Contract", icon: "📋" },
];

const POPULAR_SKILLS = [
  "React",
  "Node.js",
  "Python",
  "TypeScript",
  "AWS",
  "Docker",
  "Kubernetes",
  "Machine Learning",
  "SQL",
  "Go",
];

const TYPE_COLORS = {
  "full-time": {
    bg: "bg-primary-600/15",
    text: "text-primary-300",
    border: "border-primary-500/30",
  },
  internship: {
    bg: "bg-accent-cyan/10",
    text: "text-accent-cyan",
    border: "border-accent-cyan/30",
  },
  "part-time": {
    bg: "bg-accent-orange/10",
    text: "text-accent-orange",
    border: "border-accent-orange/30",
  },
  contract: {
    bg: "bg-accent-purple/10",
    text: "text-accent-purple",
    border: "border-accent-purple/30",
  },
  remote: {
    bg: "bg-accent-green/10",
    text: "text-accent-green",
    border: "border-accent-green/30",
  },
};

// ─── Job Card Skeleton ────────────────────────────────────────────────────────
function JobCardSkeleton() {
  return (
    <div className="glass-card p-5 space-y-3 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-dark-500/60 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-dark-500/60 rounded w-3/4" />
          <div className="h-3 bg-dark-500/40 rounded w-1/2" />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="h-5 w-20 bg-dark-500/40 rounded-lg" />
        <div className="h-5 w-16 bg-dark-500/40 rounded-lg" />
      </div>
      <div className="h-3 bg-dark-500/30 rounded w-full" />
      <div className="h-3 bg-dark-500/30 rounded w-4/5" />
      <div className="flex gap-2 pt-2">
        <div className="h-7 w-16 bg-dark-500/30 rounded" />
        <div className="h-7 w-20 bg-dark-500/30 rounded" />
        <div className="h-7 w-14 bg-dark-500/30 rounded" />
      </div>
    </div>
  );
}

// ─── Company Avatar ───────────────────────────────────────────────────────────
function CompanyAvatar({ company }) {
  const initials = company
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const colors = [
    "from-primary-600 to-accent-cyan",
    "from-accent-purple to-primary-600",
    "from-accent-cyan to-accent-green",
    "from-accent-orange to-accent-pink",
    "from-accent-green to-accent-cyan",
  ];
  const color = colors[company.charCodeAt(0) % colors.length];
  return (
    <div
      className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0 shadow-md`}
    >
      <span className="text-white text-sm font-bold">{initials}</span>
    </div>
  );
}

// ─── Single Job Card ─────────────────────────────────────────────────────────
function JobCard({ job, index, onCheckAts }) {
  const typeStyle = TYPE_COLORS[job.type] || TYPE_COLORS["full-time"];
  const postedDiff = Math.floor(
    (Date.now() - new Date(job.postedAt).getTime()) / 86400000,
  );
  const postedLabel =
    postedDiff === 0
      ? "Today"
      : postedDiff === 1
        ? "Yesterday"
        : `${postedDiff}d ago`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35 }}
      className="glass-card p-5 hover:border-primary-500/40 transition-all duration-300 group hover:shadow-glow flex flex-col gap-3"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <CompanyAvatar company={job.company} />
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-sm leading-tight group-hover:text-primary-300 transition-colors line-clamp-1">
            {job.title}
          </h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Building2 size={11} className="text-gray-500 flex-shrink-0" />
            <span className="text-gray-400 text-xs truncate">
              {job.company}
            </span>
          </div>
        </div>
        {job.salary && (
          <span className="text-xs font-semibold text-accent-green bg-accent-green/10 border border-accent-green/20 rounded-lg px-2 py-1 whitespace-nowrap flex-shrink-0">
            {job.salary}
          </span>
        )}
      </div>

      {/* Meta chips */}
      <div className="flex flex-wrap gap-1.5">
        <span
          className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-lg border ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}
        >
          <Briefcase size={9} /> {job.type}
        </span>
        <span className="inline-flex items-center gap-1 text-xs text-gray-400 bg-dark-600/60 border border-white/5 rounded-lg px-2 py-0.5">
          <MapPin size={9} /> {job.location}
        </span>
        {job.remote && (
          <span
            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-lg border ${TYPE_COLORS.remote.bg} ${TYPE_COLORS.remote.text} ${TYPE_COLORS.remote.border}`}
          >
            <Wifi size={9} /> Remote
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-xs text-gray-600 ml-auto">
          <Clock size={9} /> {postedLabel}
        </span>
      </div>

      {/* Description */}
      <p className="text-gray-500 text-xs leading-relaxed line-clamp-2">
        {job.description}
      </p>

      {/* Tags */}
      {job.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {job.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="text-xs text-gray-500 bg-dark-500/50 border border-white/5 rounded px-1.5 py-0.5"
            >
              {tag}
            </span>
          ))}
          {job.tags.length > 4 && (
            <span className="text-xs text-gray-600">
              +{job.tags.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-1">
        <a
          href={job.applyUrl}
          target="_blank"
          rel="noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary-600/20 border border-primary-500/30 text-primary-300 text-xs font-semibold hover:bg-primary-600/35 transition-all"
        >
          Apply Now <ExternalLink size={10} />
        </a>
        <button
          onClick={() => onCheckAts(job)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan text-xs font-semibold hover:bg-accent-cyan/20 transition-all whitespace-nowrap"
        >
          <Zap size={10} /> ATS Match
        </button>
      </div>
    </motion.div>
  );
}

// ─── ATS Match Modal ──────────────────────────────────────────────────────────
function AtsMatchModal({
  job,
  latestResume,
  uploadedResume,
  match,
  loading,
  error,
  onRetry,
  onClose,
}) {
  if (!job) return null;
  const matchScore = match?.score ?? null;
  const color =
    matchScore >= 80
      ? "text-accent-green"
      : matchScore >= 60
        ? "text-accent-orange"
        : "text-red-400";
  const ring =
    matchScore >= 80 ? "#10b981" : matchScore >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
        style={{
          backgroundColor: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(4px)",
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="glass-card p-8 max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-white font-bold text-lg">ATS Match Score</h3>
              <p className="text-gray-500 text-xs mt-0.5">
                {job.title} @ {job.company}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {loading ? (
            <div className="text-center py-10">
              <Loader2
                size={36}
                className="text-primary-400 animate-spin mx-auto mb-4"
              />
              <p className="text-white font-semibold mb-2">
                Calculating real ATS match
              </p>
              <p className="text-gray-500 text-sm">
                {uploadedResume
                  ? "Analyzing your uploaded resume"
                  : "Comparing your latest completed resume"}{" "}
                against this job.
              </p>
            </div>
          ) : !latestResume && !uploadedResume ? (
            <div className="text-center py-8">
              <AlertCircle size={40} className="text-gray-600 mx-auto mb-4" />
              <p className="text-white font-semibold mb-2">
                No resume available
              </p>
              <p className="text-gray-500 text-sm mb-6">
                Upload a resume above or analyze one first to see the ATS match
                score for this job.
              </p>
              <Link
                to="/analyze"
                className="glow-button flex items-center justify-center gap-2 text-sm"
                onClick={onClose}
              >
                <Zap size={14} /> Analyze My Resume
              </Link>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertCircle size={40} className="text-red-400 mx-auto mb-4" />
              <p className="text-white font-semibold mb-2">
                Could not calculate match
              </p>
              <p className="text-gray-500 text-sm mb-6">{error}</p>
              <button
                onClick={onRetry}
                className="glow-button w-full flex items-center justify-center gap-2 text-sm"
              >
                <RotateCcw size={14} /> Retry Match
              </button>
            </div>
          ) : match ? (
            <div className="text-center py-4">
              <div className="relative w-32 h-32 mx-auto mb-5">
                <svg
                  width="128"
                  height="128"
                  viewBox="0 0 120 120"
                  className="-rotate-90"
                >
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="10"
                  />
                  <motion.circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke={ring}
                    strokeWidth="10"
                    strokeLinecap="round"
                    initial={{ strokeDasharray: `0 ${2 * Math.PI * 50}` }}
                    animate={{
                      strokeDasharray: `${(matchScore / 100) * 2 * Math.PI * 50} ${2 * Math.PI * 50}`,
                    }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-4xl font-black ${color}`}>
                    {matchScore}
                  </span>
                  <span className="text-gray-500 text-xs">/ 100</span>
                </div>
              </div>
              <p className={`font-bold text-lg ${color} mb-1`}>
                {matchScore >= 80
                  ? "Strong Match"
                  : matchScore >= 60
                    ? "Good Match"
                    : "Needs Work"}
              </p>
              <p className="text-gray-400 text-sm mb-2">{match.summary}</p>
              <p className="text-gray-500 text-xs mb-6">
                Based on {match.resume.fileName} · Resume score{" "}
                {match.resume.overallScore}
              </p>
              {uploadedResume && (
                <p className="text-gray-500 text-xs mb-4">
                  Using uploaded document:{" "}
                  <span className="text-white">{uploadedResume.name}</span>
                </p>
              )}

              <div className="grid sm:grid-cols-2 gap-3 text-left mb-5">
                <div className="bg-dark-600/50 rounded-xl p-4 border border-white/5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent-green mb-3">
                    Matched Skills
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {match.matchedSkills.length > 0 ? (
                      match.matchedSkills.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs bg-accent-green/10 text-accent-green border border-accent-green/20 rounded-lg px-2.5 py-1"
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-500">
                        No strong overlap detected yet.
                      </span>
                    )}
                  </div>
                </div>
                <div className="bg-dark-600/50 rounded-xl p-4 border border-white/5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-400 mb-3">
                    Missing Skills
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {match.missingSkills.length > 0 ? (
                      match.missingSkills.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg px-2.5 py-1"
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-500">
                        You already cover the key listed skills.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-left mb-6">
                <div className="bg-dark-600/50 rounded-xl p-4 border border-white/5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary-300 mb-3">
                    Strengths
                  </p>
                  <div className="space-y-2">
                    {match.strengths.length > 0 ? (
                      match.strengths.map((item) => (
                        <div key={item} className="flex items-start gap-2">
                          <CheckCircle
                            size={12}
                            className="text-accent-green mt-0.5 flex-shrink-0"
                          />
                          <span className="text-xs text-gray-300 leading-relaxed">
                            {item}
                          </span>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-gray-500">
                        No standout strengths were detected.
                      </span>
                    )}
                  </div>
                </div>
                <div className="bg-dark-600/50 rounded-xl p-4 border border-white/5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent-orange mb-3">
                    What To Improve
                  </p>
                  <div className="space-y-2">
                    {match.improvements.length > 0 ? (
                      match.improvements.map((item) => (
                        <div key={item} className="flex items-start gap-2">
                          <AlertCircle
                            size={12}
                            className="text-accent-orange mt-0.5 flex-shrink-0"
                          />
                          <span className="text-xs text-gray-300 leading-relaxed">
                            {item}
                          </span>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-gray-500">
                        Your resume already aligns well with this role.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {(match.matchedKeywords.length > 0 ||
                match.missingKeywords.length > 0) && (
                <div className="bg-dark-600/40 rounded-xl p-4 border border-white/5 text-left mb-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                    Keyword Coverage
                  </p>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[11px] text-accent-cyan mb-2">
                        Covered
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {match.matchedKeywords.length > 0 ? (
                          match.matchedKeywords.map((tag) => (
                            <span
                              key={tag}
                              className="text-xs bg-primary-600/10 text-primary-300 border border-primary-500/20 rounded-lg px-2.5 py-1"
                            >
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500">
                            No important keywords covered yet.
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] text-red-400 mb-2">
                        Still Missing
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {match.missingKeywords.length > 0 ? (
                          match.missingKeywords.slice(0, 6).map((tag) => (
                            <span
                              key={tag}
                              className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg px-2.5 py-1"
                            >
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500">
                            No major keyword gaps left.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-dark-700/50 rounded-2xl p-4 border border-white/10 mb-4 text-left">
                <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">
                  Fix your resume PDF
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-300 text-[13px]">
                  <li>
                    Upload a text-based PDF or Word file that can be parsed by
                    ATS.
                  </li>
                  <li>
                    Place main skills and keywords in your summary and
                    experience bullets.
                  </li>
                  <li>
                    Use the Analyze page to improve wording, then re-upload for
                    a higher score.
                  </li>
                </ul>
              </div>

              <Link
                to="/analyze"
                className="glow-button flex items-center justify-center gap-2 text-sm w-full"
              >
                <Zap size={14} /> Optimize Resume for This Role
              </Link>
            </div>
          ) : (
            <div className="text-center py-8">
              <Loader2
                size={30}
                className="text-primary-400 animate-spin mx-auto mb-4"
              />
              <p className="text-gray-400 text-sm">
                Preparing match details...
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [latestResume, setLatestResume] = useState(null);
  const [uploadedResume, setUploadedResume] = useState(null);
  const [atsJob, setAtsJob] = useState(null); // which job's modal is open
  const [atsMatch, setAtsMatch] = useState(null);
  const [atsLoading, setAtsLoading] = useState(false);
  const [atsError, setAtsError] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("all");
  const [remote, setRemote] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [page, setPage] = useState(1);

  // Debounced search
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [debouncedLocation, setDebouncedLocation] = useState(location);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedLocation(location), 400);
    return () => clearTimeout(t);
  }, [location]);

  // Fetch latest resume for ATS match
  useEffect(() => {
    api
      .get("/resumes", { params: { limit: 1, status: "COMPLETED" } })
      .then((res) => setLatestResume((res.data || [])[0] || null))
      .catch(() => {});
  }, []);

  // Resume upload dropzone
  const onUploadDrop = useCallback((accepted, rejected) => {
    if (rejected.length) {
      toast.error("Only PDF or Word documents supported.");
      return;
    }
    if (accepted.length) {
      setUploadedResume(accepted[0]);
      toast.success("Resume uploaded! Ready for ATS analysis.");
    }
  }, []);

  const {
    getRootProps: getUploadProps,
    getInputProps: getUploadInputProps,
    isDragActive,
  } = useDropzone({
    onDrop: onUploadDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
  });

  const fetchAtsMatch = useCallback(
    async (jobId) => {
      if (!jobId) return;

      setAtsLoading(true);
      setAtsError("");
      try {
        let res;
        if (uploadedResume) {
          // Use the uploaded resume for analysis
          const formData = new FormData();
          formData.append("resume", uploadedResume);
          res = await api.post(`/jobs/${jobId}/analyze`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } else {
          // Use stored resume
          res = await api.get(`/jobs/${jobId}/match`);
        }
        setAtsMatch(res.data);
      } catch (err) {
        setAtsMatch(null);
        setAtsError(
          err.response?.data?.error ||
            "Failed to calculate ATS match for this job.",
        );
      } finally {
        setAtsLoading(false);
      }
    },
    [uploadedResume],
  );

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        query: debouncedQuery || undefined,
        location: debouncedLocation || undefined,
        type: type !== "all" ? type : undefined,
        remote: remote ? "true" : undefined,
        skills: selectedSkills.length ? selectedSkills.join(",") : undefined,
        page,
        limit: 9,
      };
      const res = await api.get("/jobs", { params });
      setJobs(res.data.jobs || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      setError("Failed to load jobs. Please try again.");
      toast.error("Could not reach jobs API");
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, debouncedLocation, type, remote, selectedSkills, page]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    if (!atsJob || !latestResume) return;
    fetchAtsMatch(atsJob.id);
  }, [atsJob, latestResume, fetchAtsMatch]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, debouncedLocation, type, remote, selectedSkills]);

  const toggleSkill = (skill) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );
  };

  const clearAll = () => {
    setQuery("");
    setLocation("");
    setType("all");
    setRemote(false);
    setSelectedSkills([]);
    setPage(1);
  };

  const hasFilters =
    query || location || type !== "all" || remote || selectedSkills.length > 0;
  const activeFilterCount = [
    query,
    location,
    type !== "all" ? type : null,
    remote ? "remote" : null,
    ...selectedSkills,
  ].filter(Boolean).length;

  const openAtsModal = (job) => {
    setAtsJob(job);
    setAtsMatch(null);
    setAtsError("");
  };

  return (
    <div className="pt-24 pb-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-end justify-between mb-2">
            <div>
              <h1 className="text-3xl font-black text-white">
                Find Your Next{" "}
                <span className="gradient-text">Opportunity</span>
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {total > 0 && !loading
                  ? `${total} job${total !== 1 ? "s" : ""} found`
                  : "Search across thousands of positions"}
              </p>
            </div>
            {latestResume && (
              <div className="hidden md:flex items-center gap-2 text-xs bg-accent-green/10 border border-accent-green/20 text-accent-green rounded-xl px-3 py-2">
                <CheckCircle size={12} />
                Resume ready · Score {latestResume.overallScore}
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Resume Upload Section ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.02 }}
          className="glass-card p-5 mb-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Upload size={18} className="text-primary-400" />
            <h3 className="text-white font-semibold">
              Upload Resume for ATS Matching
            </h3>
            <span className="text-gray-400 text-xs">
              Optional - upload to get instant ATS scores
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-1">
              {uploadedResume ? (
                <div className="flex items-center gap-3 p-3 bg-accent-green/10 border border-accent-green/20 rounded-xl">
                  <FileText size={16} className="text-accent-green" />
                  <span className="text-accent-green text-sm font-medium">
                    {uploadedResume.name}
                  </span>
                  <button
                    onClick={() => setUploadedResume(null)}
                    className="ml-auto text-gray-400 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div
                  {...getUploadProps()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                    isDragActive
                      ? "border-primary-400 bg-primary-500/10"
                      : "border-gray-600 hover:border-gray-500"
                  }`}
                >
                  <Upload size={24} className="text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-300 text-sm">
                    {isDragActive
                      ? "Drop your resume here"
                      : "Click to upload or drag & drop"}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    PDF, DOC, DOCX up to 5MB
                  </p>
                  <input {...getUploadInputProps()} />
                </div>
              )}
            </div>

            <div className="text-xs text-gray-500 sm:max-w-xs space-y-2">
              <p>
                Upload your resume to get real-time ATS compatibility scores for
                each job.
              </p>
              <p className="text-accent-cyan text-[11px] leading-snug">
                Tip: Use a text-based PDF or Word file. If your PDF is scanned
                or image-only, the extraction may fail.
              </p>
              {!latestResume && uploadedResume && (
                <span className="block text-accent-cyan mt-1">
                  ✓ Ready to analyze against jobs
                </span>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Search Bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card p-4 mb-4"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Keyword */}
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Job title, company, or skill..."
                className="input-field w-full pl-9 text-sm"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            {/* Location */}
            <div className="relative sm:w-60">
              <MapPin
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City or Remote..."
                className="input-field w-full pl-9 text-sm"
              />
              {location && (
                <button
                  onClick={() => setLocation("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            {/* Mobile filter toggle */}
            <button
              onClick={() => setShowFilters((p) => !p)}
              className={`sm:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                showFilters || activeFilterCount > 0
                  ? "bg-primary-600/20 border-primary-500/40 text-primary-300"
                  : "border-white/10 text-gray-400 hover:text-white"
              }`}
            >
              <SlidersHorizontal size={14} />
              Filters{" "}
              {activeFilterCount > 0 && (
                <span className="bg-primary-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* ── Filters Row (desktop always visible, mobile toggle) ── */}
          <AnimatePresence>
            {(showFilters ||
              (typeof window !== "undefined" && window.innerWidth >= 640)) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden sm:!h-auto sm:!opacity-100"
              >
                <div className="pt-3 mt-3 border-t border-white/5 space-y-3">
                  {/* Job type chips */}
                  <div className="flex flex-wrap gap-2">
                    {JOB_TYPES.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setType(t.value)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          type === t.value
                            ? "bg-primary-600/20 border-primary-500/40 text-primary-300"
                            : "border-white/10 text-gray-400 hover:text-white hover:border-white/20"
                        }`}
                      >
                        <span>{t.icon}</span> {t.label}
                      </button>
                    ))}
                    {/* Remote toggle */}
                    <button
                      onClick={() => setRemote((p) => !p)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        remote
                          ? "bg-accent-green/10 border-accent-green/30 text-accent-green"
                          : "border-white/10 text-gray-400 hover:text-white hover:border-white/20"
                      }`}
                    >
                      <Wifi size={11} /> Remote Only
                    </button>
                    {hasFilters && (
                      <button
                        onClick={clearAll}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all ml-auto"
                      >
                        <RotateCcw size={11} /> Clear all
                      </button>
                    )}
                  </div>
                  {/* Skills */}
                  <div className="flex flex-wrap gap-2">
                    <span className="text-gray-600 text-xs self-center flex items-center gap-1">
                      <Tag size={10} /> Skills:
                    </span>
                    {POPULAR_SKILLS.map((skill) => (
                      <button
                        key={skill}
                        onClick={() => toggleSkill(skill)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                          selectedSkills.includes(skill)
                            ? "bg-accent-purple/15 border-accent-purple/40 text-accent-purple"
                            : "border-white/5 text-gray-500 hover:text-gray-300 hover:border-white/15"
                        }`}
                      >
                        {selectedSkills.includes(skill) && "✓ "}
                        {skill}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Active filter pills ── */}
        {hasFilters && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-wrap gap-2 mb-4"
          >
            {query && (
              <Pill label={`"${query}"`} onRemove={() => setQuery("")} />
            )}
            {location && (
              <Pill
                label={location}
                icon={<MapPin size={10} />}
                onRemove={() => setLocation("")}
              />
            )}
            {type !== "all" && (
              <Pill label={type} onRemove={() => setType("all")} />
            )}
            {remote && (
              <Pill
                label="Remote"
                icon={<Wifi size={10} />}
                onRemove={() => setRemote(false)}
              />
            )}
            {selectedSkills.map((s) => (
              <Pill
                key={s}
                label={s}
                icon={<Tag size={10} />}
                onRemove={() => toggleSkill(s)}
              />
            ))}
          </motion.div>
        )}

        {/* ── Content ── */}
        {error ? (
          <div className="glass-card p-12 text-center">
            <AlertCircle size={40} className="text-red-400 mx-auto mb-4" />
            <p className="text-white font-semibold mb-2">{error}</p>
            <button
              onClick={fetchJobs}
              className="glow-button text-sm mt-4 flex items-center gap-2 mx-auto"
            >
              <RotateCcw size={14} /> Retry
            </button>
          </div>
        ) : loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <JobCardSkeleton key={i} />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-16 text-center"
          >
            <Search size={40} className="text-gray-700 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">No jobs found</h2>
            <p className="text-gray-500 mb-6">
              Try adjusting your search or filters
            </p>
            <button
              onClick={clearAll}
              className="glow-button text-sm flex items-center gap-2 mx-auto"
            >
              <RotateCcw size={14} /> Clear Filters
            </button>
          </motion.div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {jobs.map((job, i) => (
                <JobCard
                  key={job.id}
                  job={job}
                  index={i}
                  onCheckAts={openAtsModal}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center gap-2"
              >
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-sm transition-all"
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const pg = i + 1;
                    return (
                      <button
                        key={pg}
                        onClick={() => setPage(pg)}
                        className={`w-9 h-9 rounded-xl text-sm font-medium transition-all ${
                          page === pg
                            ? "bg-primary-600/20 border border-primary-500/40 text-primary-300"
                            : "border border-white/5 text-gray-500 hover:text-white hover:border-white/20"
                        }`}
                      >
                        {pg}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-sm transition-all"
                >
                  Next <ChevronRight size={14} />
                </button>
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* ATS Match Modal */}
      {atsJob && (
        <AtsMatchModal
          job={atsJob}
          latestResume={latestResume}
          uploadedResume={uploadedResume}
          match={atsMatch}
          loading={atsLoading}
          error={atsError}
          onRetry={() => fetchAtsMatch(atsJob.id)}
          onClose={() => {
            setAtsJob(null);
            setAtsMatch(null);
            setAtsError("");
          }}
        />
      )}
    </div>
  );
}

// ─── Filter Pill ──────────────────────────────────────────────────────────────
function Pill({ label, icon, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-primary-600/15 border border-primary-500/30 text-primary-300 text-xs rounded-lg px-2.5 py-1">
      {icon}
      {label}
      <button
        onClick={onRemove}
        className="ml-0.5 hover:text-white transition-colors"
      >
        <X size={10} />
      </button>
    </span>
  );
}
