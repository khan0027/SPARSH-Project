// Frontend logic for HR Candidate Email Response Tool

const form = document.getElementById('emailForm');
const previewBtn = document.getElementById('previewBtn');
const sendBtn = document.getElementById('sendBtn');
const successMsg = document.getElementById('successMsg');
const errorMsg = document.getElementById('errorMsg');

const statusError = document.getElementById('statusError');
const nameError = document.getElementById('nameError');
const emailError = document.getElementById('emailError');
const positionError = document.getElementById('positionError');

const pvSection = document.getElementById('previewSection');
const pvTo = document.getElementById('pvTo');
const pvSubject = document.getElementById('pvSubject');
const pvBody = document.getElementById('pvBody');
const hidePreviewBtn = document.getElementById('hidePreviewBtn');

document.getElementById('year').textContent = new Date().getFullYear();

const TEMPLATES = {
  selected: `Dear [Candidate Name],

We are pleased to inform you that you have been selected for the position of [Position].
Please reply to this email to confirm your acceptance.

Best regards,
HR Team`,
  rejected: `Dear [Candidate Name],

Thank you for applying for the position of [Position].
We regret to inform you that we have decided to move forward with other candidates.

Best regards,
HR Team`
};

function buildMessage({ status, name, position }) {
  const key = status === 'selected' ? 'selected' : 'rejected';
  const body = TEMPLATES[key]
    .replaceAll('[Candidate Name]', name)
    .replaceAll('[Position]', position);
  const subject = key === 'selected'
    ? `Application Status: Selected - ${position}`
    : `Application Status: Update - ${position}`;
  return { subject, body };
}

function getFormData() {
  const formData = new FormData(form);
  const status = formData.get('status');
  const name = formData.get('name')?.trim() || '';
  const email = formData.get('email')?.trim() || '';
  const position = formData.get('position')?.trim() || '';
  return { status, name, email, position };
}

function validate() {
  // Reset errors
  [statusError, nameError, emailError, positionError].forEach(el => el.hidden = true);

  const { status, name, email, position } = getFormData();
  let ok = true;

  if (!status) { statusError.hidden = false; ok = false; }
  if (!name) { nameError.hidden = false; ok = false; }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { emailError.hidden = false; ok = false; }
  if (!position) { positionError.hidden = false; ok = false; }

  return ok;
}

function showPreview() {
  if (!validate()) return;
  const { status, name, email, position } = getFormData();
  const { subject, body } = buildMessage({ status, name, position });

  pvTo.textContent = email;
  pvSubject.textContent = subject;
  pvBody.textContent = body;

  pvSection.hidden = false;
  pvSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

hidePreviewBtn.addEventListener('click', () => {
  pvSection.hidden = true;
});

previewBtn.addEventListener('click', showPreview);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validate()) return;

  const { status, name, email, position } = getFormData();
  successMsg.hidden = true;
  errorMsg.hidden = true;

  sendBtn.disabled = true;
  sendBtn.textContent = 'Sending...';

  try {
  const res = await fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, name, email, position })
  });

  console.log("Raw response status:", res.status);   // 👈 debug
  const text = await res.text();                     // 👈 read as plain text first
  console.log("Raw response body:", text);           // 👈 debug

  let data;
  try {
    data = JSON.parse(text); // try to parse manually
  } catch (e) {
    throw new Error("Invalid JSON from server: " + text);
  }

  if (!res.ok || !data.ok) {
    throw new Error(data?.error || 'Unknown error');
  }

  successMsg.textContent = 'Email sent successfully ✅';
  successMsg.hidden = false;
  form.reset();
  pvSection.hidden = true;
} catch (err) {
  console.error(err); // 👈 see the full error
  errorMsg.textContent = `Failed to send email: ${err.message}`;
  errorMsg.hidden = false;
} finally {
  sendBtn.disabled = false;
  sendBtn.textContent = 'Send Email';
}

});
