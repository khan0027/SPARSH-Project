# HR Candidate Email Response Tool

A minimal web app to help HR send **selection** or **rejection** emails using predefined templates.
No database required.

## Tech
- Frontend: HTML, CSS, JavaScript (vanilla)
- Backend: Node.js, Express, Nodemailer
- Email: SMTP (configure via `.env`)

## Quick Start

```bash
# 1) Extract the zip (or clone)
cd hr-candidate-email-tool

# 2) Install dependencies
npm install

# 3) Configure environment
cp .env.example .env
# Edit .env to add your SMTP credentials

# 4) Run the server
npm start

# 5) Open the app
# Visit http://localhost:3000 in your browser
```

### SMTP Tips
- For Gmail, create an **App Password** and use it here.
- Alternatively, use services like Mailtrap or any SMTP provider.

## API
- `POST /api/send-email`
  - JSON body: `{ "status": "selected"|"rejected", "name": "Jane", "email": "jane@ex.com", "position": "Frontend Dev" }`
  - Response: `{ ok: true, messageId: "..." }` or `{ ok: false, error: "..." }`

## Templates
- Templates are defined in both backend and frontend (`selected` and `rejected`).
- Placeholders: `[Candidate Name]`, `[Position]`

## Notes
- This demo sends **plain text** emails for reliability.
- Proper error messages surface to the UI without exposing secrets.
- The UI provides a **Preview** before sending and basic validation.
