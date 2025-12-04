document.getElementById("generateBtn").onclick = async () => {
  const res = await fetch("/generate");
  const data = await res.json();

  if (data.pairingCode) {
    document.getElementById("pairing").innerHTML =
      "Your Pairing Code:<br><b>" + data.pairingCode + "</b>";
  }

  if (data.credsJs) {
    document.getElementById("credsBox").value = data.credsJs;
    document.getElementById("downloadBtn").style.display = "block";
  }
};

document.getElementById("downloadBtn").onclick = () => {
  const content = document.getElementById("credsBox").value;
  const blob = new Blob([content], { type: "text/javascript" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "creds.js";
  a.click();
};
