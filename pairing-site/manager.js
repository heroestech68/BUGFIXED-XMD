const {
    default: makeWaSocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

async function generatePairingCode() {
    const { version } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState("./auth");

    const sock = makeWaSocket({
        auth: state,
        version,
        printQRInTerminal: false,
        browser: ["Bugfixed-XMD", "Chrome", "5.0"],
    });

    return new Promise((resolve, reject) => {
        sock.ev.on("connection.update", async (update) => {
            const { pairingCode, connection } = update;

            if (pairingCode) resolve(pairingCode);

            if (connection === "close") reject("Connection closed");
        });
    });
}

module.exports = { generatePairingCode };
