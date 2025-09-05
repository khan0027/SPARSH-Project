
const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const multer = require('multer');
const cors = require('cors');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'change_this_secret_2',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 1000 * 60 * 60 }
}));

app.use(express.static(path.join(__dirname, 'public')));

const QUESTIONS_PATH = path.join(__dirname, 'data', 'questions.json');
let QUESTION_BANK = {};
try {
  const raw = fs.readFileSync(QUESTIONS_PATH, 'utf-8');
  QUESTION_BANK = JSON.parse(raw);
} catch (e) {
  console.error('Failed to load questions.json', e);
  process.exit(1);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function pickN(arr, n) {
  const copy = arr.slice();
  shuffle(copy);
  return copy.slice(0, Math.min(n, copy.length));
}

app.get('/api/languages', (req, res) => {
  res.json({ languages: Object.keys(QUESTION_BANK) });
});

app.post('/api/start', (req, res) => {
  const body = req.body || {};
  let languages = Array.isArray(body.languages) && body.languages.length ? body.languages : (req.session.detectedLanguages || []);
  const perLanguage = parseInt(body.perLanguage || 5, 10) || 5;
  const timePerQuestion = parseInt(body.timePerQuestion || 60, 10) || 60;
  const threshold = parseInt(body.threshold || 60, 10) || 60;

  if (!Array.isArray(languages) || languages.length === 0) {
    return res.status(400).json({ error: 'No languages selected or detected' });
  }

  let pool = [];
  let answerKey = {};
  let idCounter = 1;
  for (const lang of languages) {
    const bank = QUESTION_BANK[lang];
    if (!bank) continue;
    const chosen = pickN(bank, perLanguage);
    for (const q of chosen) {
      const qid = `${lang}-${idCounter++}`;
      answerKey[qid] = (typeof q.correctAnswer === 'number') ? q.correctAnswer : q.options.indexOf(q.correctAnswer);
      pool.push({
        id: qid,
        language: lang,
        question: q.question,
        options: q.options,
        timeLimit: timePerQuestion
      });
    }
  }
  if (pool.length === 0) {
    return res.status(400).json({ error: 'No questions found for selected languages' });
  }

  shuffle(pool);

  req.session.quiz = {
    languages,
    questions: pool,
    answerKey,
    answers: {},
    currentIndex: 0,
    submitted: false,
    score: 0,
    threshold,
    startedAt: Date.now(),
    perLanguage
  };

  res.json({ ok: true, total: pool.length, languages });
});

app.get('/api/state', (req, res) => {
  const quiz = req.session.quiz;
  if (!quiz) return res.status(400).json({ error: 'Quiz not started' });

  const idx = Math.max(0, Math.min(quiz.currentIndex, quiz.questions.length - 1));
  const q = quiz.questions[idx];
  const selected = quiz.answers[q.id];
  res.json({
    currentIndex: idx,
    total: quiz.questions.length,
    question: {
      id: q.id,
      question: q.question,
      options: q.options,
      language: q.language,
      timeLimit: q.timeLimit
    },
    selectedAnswer: typeof selected === 'number' ? selected : null,
    progress: Math.round((Object.keys(quiz.answers).length / quiz.questions.length) * 100),
    submitted: quiz.submitted
  });
});

app.post('/api/answer', (req, res) => {
  const quiz = req.session.quiz;
  if (!quiz) return res.status(400).json({ error: 'Quiz not started' });
  const { questionId, answerIndex } = req.body || {};
  const exists = quiz.questions.find(q => q.id === questionId);
  if (!exists) return res.status(400).json({ error: 'Invalid questionId' });
  if (typeof answerIndex !== 'number' || answerIndex < 0 || answerIndex >= exists.options.length) {
    return res.status(400).json({ error: 'Invalid answerIndex' });
  }
  quiz.answers[questionId] = answerIndex;
  res.json({ ok: true });
});

app.post('/api/navigate', (req, res) => {
  const quiz = req.session.quiz;
  if (!quiz) return res.status(400).json({ error: 'Quiz not started' });
  const { direction } = req.body || {};
  if (direction === 'next') quiz.currentIndex = Math.min(quiz.currentIndex + 1, quiz.questions.length - 1);
  if (direction === 'prev') quiz.currentIndex = Math.max(quiz.currentIndex - 1, 0);
  res.json({ currentIndex: quiz.currentIndex });
});

app.post('/api/submit', (req, res) => {
  const quiz = req.session.quiz;
  if (!quiz) return res.status(400).json({ error: 'Quiz not started' });
  if (quiz.submitted) return res.json({ score: quiz.score, total: quiz.questions.length, passed: quiz.score >= quiz.threshold });

  let correct = 0;
  const perLangStats = {};
  for (const q of quiz.questions) {
    const user = quiz.answers[q.id];
    const correctIndex = quiz.answerKey[q.id];
    if (!perLangStats[q.language]) perLangStats[q.language] = { correct: 0, total: 0 };
    perLangStats[q.language].total += 1;
    if (typeof user === 'number' && user === correctIndex) {
      correct += 1;
      perLangStats[q.language].correct += 1;
    }
  }
  const total = quiz.questions.length;
  const score = Math.round((correct / total) * 100);
  quiz.score = score;
  quiz.submitted = true;
  quiz.perLangStats = perLangStats;

  res.json({ score, total, passed: score >= quiz.threshold, threshold: quiz.threshold, perLangStats });
});

app.get('/api/result', (req, res) => {
  const quiz = req.session.quiz;
  if (!quiz || !quiz.submitted) return res.status(400).json({ error: 'No result yet' });
  res.json({
    score: quiz.score,
    total: quiz.questions.length,
    passed: quiz.score >= quiz.threshold,
    threshold: quiz.threshold,
    perLangStats: quiz.perLangStats || {}
  });
});

app.get('/api/review', (req, res) => {
  const quiz = req.session.quiz;
  if (!quiz || !quiz.submitted) return res.status(400).json({ error: 'No review available' });

  const review = quiz.questions.map(q => {
    const correctIndex = quiz.answerKey[q.id];
    const userIndex = quiz.answers[q.id];
    return {
      id: q.id,
      language: q.language,
      question: q.question,
      options: q.options,
      yourAnswer: typeof userIndex === 'number' ? q.options[userIndex] : null,
      isCorrect: userIndex === correctIndex,
      correctAnswer: q.options[correctIndex]
    };
  });
  res.json({ review });
});

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only PDF, DOC, DOCX files are allowed.'));
    }
    cb(null, true);
  }
});

app.post('/api/upload', upload.single('resume'), (req, res) => {
  const quiz = req.session.quiz;
  if (!quiz || !quiz.submitted || quiz.score < quiz.threshold) {
    return res.status(403).json({ error: 'Upload not allowed. Minimum score not met.' });
  }
  res.json({ ok: true, filename: req.file.filename });
});

const detectStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = 'detect-' + Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});
const detectUpload = multer({ storage: detectStorage });

app.post('/api/upload-resume-for-questions', detectUpload.single('resume'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const filePath = req.file.path;
  const mime = req.file.mimetype || '';

  try {
    let text = '';

    if (mime === 'application/pdf' || filePath.toLowerCase().endsWith('.pdf')) {
      const data = await pdfParse(fs.readFileSync(filePath));
      text = data.text || '';
    } else if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || filePath.toLowerCase().endsWith('.docx')) {
      const result = await mammoth.extractRawText({ path: filePath });
      text = result.value || '';
    } else if (mime === 'application/msword' || filePath.toLowerCase().endsWith('.doc')) {
      text = fs.readFileSync(filePath, 'utf-8') || '';
    } else {
      text = fs.readFileSync(filePath, 'utf-8') || '';
    }

    const available = Object.keys(QUESTION_BANK);
    const found = [];
    const lower = text.toLowerCase();
    for (const lang of available) {
      const key = lang.toLowerCase();
      if (lower.includes(key)) found.push(lang);
      if (key === 'react' && (lower.includes('react.js') || lower.includes('reactjs'))) {
        if (!found.includes('React')) found.push('React');
      }
    }

    req.session.detectedLanguages = found;
    res.json({ detected: found, textSnippet: text.slice(0, 1000) });
  } catch (err) {
    console.error('Error parsing resume', err);
    res.status(500).json({ error: 'Failed to parse resume' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
