const $ = id => document.getElementById(id);

const startBtn = $('startBtn');
const phoneInput = $('phone');
const statusEl = $('status');
const pairingBox = $('pairingBox');
const pairingCodeEl = $('pairingCode');
const downloadArea = $('downloadArea');
const downloadLink = $('downloadLink');

let sessionId = null;
let pollTimer = null;

function makeSessionId(){
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
}

function setLoading(on){
  startBtn.disabled = on;
  startBtn.style.opacity = on ? 0.7 : 1;
}

startBtn.addEventListener('click', startSession);
phoneInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') startSession(); });

async function startSession(){
  const phone = phoneInput.value.trim();
  if (!phone) { alert('Enter phone number with country code'); phoneInput.focus(); return; }

  sessionId = makeSessionId();
  setLoading(true);
  statusEl.textContent = 'Starting session...';
  pairingBox.style.display = 'none';
  downloadArea.style.display = 'none';
  pairingCodeEl.textContent = '';

  try {
    const res = await fetch('/api/start-session', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ phoneNumber: phone })
    });
    const j = await res.json();
    if (!j || j.ok === false) {
      statusEl.textContent = 'Server error starting session';
      setLoading(false);
      return;
    }
    statusEl.textContent = 'Session created — waiting for pairing code';
    pollTimer = setInterval(pollStatus, 2000);
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Network error';
    setLoading(false);
  }
}

async function pollStatus(){
  if (!sessionId) return;
  try {
    const res = await fetch(`/api/status/${sessionId}`);
    const j = await res.json();
    if (!j || j.ok === false) {
      statusEl.textContent = 'Session not found';
      return;
    }

    if (j.pairingCode) {
      pairingBox.style.display = 'block';
      pairingCodeEl.textContent = j.pairingCode;
      statusEl.textContent = 'Pairing code generated — enter it in WhatsApp (Linked devices → Link a device)';
    } else {
      statusEl.textContent = 'Waiting for pairing code...';
    }

    if (j.ready) {
      clearInterval(pollTimer);
      statusEl.textContent = 'Paired — credentials ready';
      downloadArea.style.display = 'block';
      downloadLink.href = `/api/download-creds/${sessionId}`;
      setLoading(false);
    }
  } catch (err) {
    console.error('poll error', err);
    statusEl.textContent = 'Polling error';
  }
}
