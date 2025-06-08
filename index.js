const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// ✅ APIKEY & DOMAIN baru
const APIKEY = "ptla_8mD3ktx8hiGYao6gf50evx55qufE9gQGMm0D6hOzq1D";
const DOMAIN = "https://tigerhosting.blackhunter.my.id";

// ✅ Konfigurasi default
const EGG = "15";
const NESTID = "5";
const LOC = "1";

// ✅ Daftar paket server
const plans = {
  "1gb": { ram: "1000", disk: "1000", cpu: "40" },
  "2gb": { ram: "2000", disk: "1000", cpu: "60" },
  "3gb": { ram: "3000", disk: "2000", cpu: "80" },
  "4gb": { ram: "4000", disk: "2000", cpu: "100" },
  "5gb": { ram: "5000", disk: "3000", cpu: "120" },
  "6gb": { ram: "6000", disk: "3000", cpu: "140" },
  "7gb": { ram: "7000", disk: "4000", cpu: "160" },
  "8gb": { ram: "8000", disk: "4000", cpu: "180" },
  "9gb": { ram: "9000", disk: "5000", cpu: "200" },
  "10gb": { ram: "10000", disk: "5000", cpu: "220" },
  "unlimited": { ram: "0", disk: "0", cpu: "0" },
  "unli": { ram: "0", disk: "0", cpu: "0" }
};

// ✅ Endpoint utama untuk membuat server
app.post('/create-server', async (req, res) => {
  const { command, username } = req.body;
  const plan = plans[command];

  if (!plan) return res.status(400).json({ error: "Invalid plan" });

  const email = `${username}@gmail.com`;
  const password = username + crypto.randomBytes(2).toString('hex');
  const name = username.charAt(0).toUpperCase() + username.slice(1) + " Server";

  try {
    // ➤ Buat user
    const userRes = await fetch(`${DOMAIN}/api/application/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${APIKEY}`
      },
      body: JSON.stringify({
        email, username, first_name: name, last_name: "Server",
        language: "en", password
      })
    });

    const userData = await userRes.json();
    if (userData.errors) return res.status(400).json(userData.errors[0]);

    const userId = userData.attributes.id;

    // ➤ Ambil startup egg
    const eggRes = await fetch(`${DOMAIN}/api/application/nests/${NESTID}/eggs/${EGG}`, {
      headers: { "Authorization": `Bearer ${APIKEY}` }
    });
    const eggData = await eggRes.json();
    const startup = eggData.attributes.startup;

    // ➤ Buat server
    const serverRes = await fetch(`${DOMAIN}/api/application/servers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${APIKEY}`
      },
      body: JSON.stringify({
        name,
        user: userId,
        egg: parseInt(EGG),
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
        startup,
        environment: {
          INST: "npm",
          USER_UPLOAD: "0",
          AUTO_UPDATE: "0",
          CMD_RUN: "npm start"
        },
        limits: {
          memory: plan.ram,
          swap: 0,
          disk: plan.disk,
          io: 500,
          cpu: plan.cpu
        },
        feature_limits: { databases: 5, backups: 5, allocations: 5 },
        deploy: { locations: [parseInt(LOC)], dedicated_ip: false, port_range: [] }
      })
    });

    const serverData = await serverRes.json();
    if (serverData.errors) return res.status(400).json(serverData.errors[0]);

    // ✅ Response sukses
    res.json({
      message: "Server created successfully",
      username,
      password,
      server_id: serverData.attributes.id,
      specs: {
        ram: plan.ram === "0" ? "Unlimited" : plan.ram + "MB",
        disk: plan.disk === "0" ? "Unlimited" : plan.disk + "MB",
        cpu: plan.cpu === "0" ? "Unlimited" : plan.cpu + "%"
      },
      panel_url: DOMAIN
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Jalankan server di port 3000
app.listen(3000, () => console.log("✅ Server running on port 3000"));
