
# Technical Assessment Platform (Resume-driven)

This version adds resume-based language detection and extra sample languages (Java, C++, React).

## Run locally
1. Install Node.js 18+
2. In project folder:
   ```bash
   npm install
   npm start
   ```
3. Open http://localhost:3000

## Notes
- Resume detection endpoint: POST /api/upload-resume-for-questions (multipart 'resume')
- Final upload endpoint: POST /api/upload (requires passing the quiz)
- Uses pdf-parse and mammoth (DOCX) for parsing resumes
