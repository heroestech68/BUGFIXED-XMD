const $ = id => document.getElementById(id);

let sessionId = null;
let timer = null;

$("startBtn").onclick = async () => {
  const phone = $("phone").value.trim();
  if (!phone) return alert("Enter phone number!");

  $("status").innerText = "Starting session...";

  const res = await fetch("/api/start-session", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ phoneNumber: phone })
  });

  const data = await res.json();
  sessionId = data.session;

  $("status").innerText = "Waiting for pairing code...";

  timer = setInterval(checkStatus, 1500);
};

async function checkStatus() {
  const res = await fetch(`/api/status/${sessionId}`);
  const data = await res.json();

  if (data.pairingCode) {
    $("pairingContainer").style.display = "block";
    $("pairCode").innerText = data.pairingCode;
    $("status").innerText = "Enter the code in WhatsApp";
  }

  if (data.ready) {
    $("status").innerText = "Session Paired ✔";
    $("downloadLink").style.display = "block";
    $("downloadLink").href = `/api/download-creds/${sessionId}`;
    clearInterval(timer);
  }
}
