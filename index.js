// Express Web Server for Creating Pterodactyl Panel User and Server
const express = require("express");
const fetch = require("node-fetch");
const crypto = require("crypto");
const fs = require("fs");
const app = express();

app.use(express.json());

const egg = "15";
const nestid = "5";
const loc = "1";
const domain = "https://tigerhosting.blackhunter.my.id";
const apikey = "ptla_8mD3ktx8hiGYao6gf50evx55qufE9gQGMm0D6hOzq1D";

const ramDiskCpuMap = {
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

app.post("/create-server", async (req, res) => {
  const { command, username } = req.body;
  if (!ramDiskCpuMap[command]) return res.status(400).json({ error: "Invalid plan." });
  if (!username) return res.status(400).json({ error: "Username is required." });

  const { ram, disk, cpu } = ramDiskCpuMap[command];
  const email = `${username.toLowerCase()}@gmail.com`;
  const name = `${username.charAt(0).toUpperCase() + username.slice(1)} Server`;
  const password = username + crypto.randomBytes(2).toString("hex");

  try {
    const userRes = await fetch(`${domain}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${apikey}`
      },
      body: JSON.stringify({
        email,
        username: username.toLowerCase(),
        first_name: name,
        last_name: "Server",
        language: "en",
        password
      })
    });

    const userData = await userRes.json();
    if (userData.errors) return res.status(400).json(userData.errors[0]);
    const userId = userData.attributes.id;

    const eggData = await (await fetch(`${domain}/api/application/nests/${nestid}/eggs/${egg}`, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${apikey}`
      }
    })).json();

    const startup = eggData.attributes.startup;

    const serverRes = await fetch(`${domain}/api/application/servers`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${apikey}`
      },
      body: JSON.stringify({
        name,
        description: new Date().toISOString(),
        user: userId,
        egg: parseInt(egg),
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
        startup,
        environment: {
          INST: "npm",
          USER_UPLOAD: "0",
          AUTO_UPDATE: "0",
          CMD_RUN: "npm start"
        },
        limits: {
          memory: ram,
          swap: 0,
          disk,
          io: 500,
          cpu
        },
        feature_limits: {
          databases: 5,
          backups: 5,
          allocations: 5
        },
        deploy: {
          locations: [parseInt(loc)],
          dedicated_ip: false,
          port_range: []
        }
      })
    });

    const serverData = await serverRes.json();
    if (serverData.errors) return res.status(400).json(serverData.errors[0]);

    const server = serverData.attributes;

    res.json({
      message: "Server created successfully.",
      server_id: server.id,
      username: userData.attributes.username,
      password,
      specs: {
        ram: ram === "0" ? "Unlimited" : `${parseInt(ram) / 1000}GB`,
        disk: disk === "0" ? "Unlimited" : `${parseInt(disk) / 1000}GB`,
        cpu: cpu === "0" ? "Unlimited" : `${cpu}%`
      },
      panel_url: domain
    });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
