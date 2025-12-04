async function generateCode() {
    document.getElementById("result").innerHTML = "Generating...";
    let res = await fetch("/generate");
    let data = await res.json();

    if (data.status) {
        document.getElementById("result").innerHTML =
            "<h2>Your Pairing Code:</h2><h1>" + data.code + "</h1>";
    } else {
        document.getElementById("result").innerHTML = "Error: " + data.message;
    }
}

async function saveCreds() {
    let creds = document.getElementById("credsBox").value;

    let res = await fetch("/save-creds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creds })
    });

    let data = await res.json();
    alert(data.message);
}
