const $ = id => document.getElementById(id);
const phoneInput = $('phone');
const submitBtn = $('submitBtn');
const statusText = $('statusText');
const qrImg = $('qrImg');
const credsPre = $('credsPre');
const actionRow = $('actionRow');
const downloadJs = $('downloadJs');
const downloadJson = $('downloadJson');

submitBtn.addEventListener('click', async () => {
  const phone = phoneInput.value.trim();
  if (!phone) { statusText.textContent = 'Enter phone (e.g. 254712345678)'; return; }

  statusText.textContent = 'Creating session…';
  qrImg.style.display = 'none'; credsPre.style.display = 'none'; actionRow.style.display = 'none';

  try {
    const res = await fetch('/api/pair', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ phone })
    });
    const j = await res.json();
    if (!j.ok) { statusText.textContent = 'Error: ' + (j.error || 'unknown'); return; }

    statusText.innerHTML = `Session: <b>${j.session}</b>`;
    if (j.type === 'pairingCode' && j.code) {
      statusText.innerHTML += `<br/>Pairing code: <span style="font-family:monospace;color:#00d166">${j.code}</span>`;
    } else if (j.type === 'qr' && j.qr) {
      qrImg.src = j.qr; qrImg.style.display = 'block';
      statusText.innerHTML += '<br/>Scan QR (WhatsApp → Linked Devices → Link a device)';
    } else {
      statusText.innerHTML += '<br/>Waiting for pairing info…';
    }

    // poll for creds
    const sid = j.session;
    const poll = setInterval(async () => {
      try {
        const s = await fetch('/api/status/' + sid);
        const d = await s.json();
        if (d.ok && d.ready) {
          clearInterval(poll);
          statusText.textContent = 'Pairing complete — creds ready';
          credsPre.style.display = 'block';
          credsPre.textContent = d.creds;

          actionRow.style.display = 'flex';
          downloadJs.href = `/api/download/${sid}/js`;
          downloadJson.href = `/api/download/${sid}/json`;
        }
      } catch (e) {
        console.error(e);
      }
    }, 2000);

  } catch (err) {
    console.error(err);
    statusText.textContent = 'Network error: ' + (err.message || err);
  }
});
