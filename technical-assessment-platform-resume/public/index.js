
async function loadLanguages() {
  const res = await fetch('/api/languages');
  const data = await res.json();
  const list = document.getElementById('langList');
  list.innerHTML = '';

  (data.languages || []).forEach(lang => {
    const id = `lang-${lang}`.replace(/\s+/g, '-');
    const item = document.createElement('label');
    item.className = 'checkbox';
    item.innerHTML = `<input type="checkbox" value="${lang}" id="${id}"> ${lang}`;
    list.appendChild(item);
  });

  list.addEventListener('change', () => {
    const anyChecked = list.querySelectorAll('input[type="checkbox"]:checked').length > 0;
    document.getElementById('startBtn').disabled = !anyChecked;
  });
}

async function startTest() {
  const selected = Array.from(document.querySelectorAll('#langList input[type="checkbox"]:checked')).map(i => i.value);
  const perLanguage = parseInt(document.getElementById('perLanguage').value, 10);
  const timePerQuestion = parseInt(document.getElementById('timePerQuestion').value, 10);
  const threshold = parseInt(document.getElementById('threshold').value, 10);

  const msg = document.getElementById('msg');
  msg.textContent = '';
  try {
    const res = await fetch('/api/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ languages: selected, perLanguage, timePerQuestion, threshold })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to start test');
    window.location.href = '/test.html';
  } catch (e) {
    msg.textContent = e.message;
    msg.classList.add('error');
  }
}

async function detectLanguages() {
  const fileInput = document.getElementById('resumeDetect');
  const msg = document.getElementById('detectedMsg');
  msg.textContent = '';
  if (!fileInput.files.length) {
    msg.textContent = 'Please choose a resume file.';
    msg.classList.add('error');
    return;
  }
  const file = fileInput.files[0];
  const form = new FormData();
  form.append('resume', file);
  msg.textContent = 'Detecting...';
  try {
    const res = await fetch('/api/upload-resume-for-questions', { method: 'POST', body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Detection failed');
    const detected = data.detected || [];
    msg.textContent = detected.length ? 'Detected: ' + detected.join(', ') : 'No languages detected. Please select manually.';
    msg.classList.remove('error');
    msg.classList.add('success');

    detected.forEach(lang => {
      const el = document.getElementById(`lang-${lang}`.replace(/\s+/g, '-'));
      if (el) el.checked = true;
    });
    document.getElementById('langList').dispatchEvent(new Event('change'));
  } catch (e) {
    msg.textContent = e.message;
    msg.classList.add('error');
  }
}

document.getElementById('startBtn').addEventListener('click', startTest);
document.getElementById('detectBtn').addEventListener('click', detectLanguages);
loadLanguages();
