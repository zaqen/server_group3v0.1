const express = require("express")
const os = require("os")
const http = require("http");
const fs = require('fs');
const axios = require('axios');

const app = new express()
const appDatabase = new express()

const portNr = 8081
const serverIP = getServerIP()
const databaseIP = "192.168.1.99"
const databasePortNr = 8100
const loadBalancerIP = "192.168.1.95"
const loadBalancerPortNr = 8080
var timesResponded = 0
app.use(express.json());

//Skaffar serverns egna IP till en const
function getServerIP() {
    const interface = os.networkInterfaces()
    for (const name of Object.keys(interface)) {
        for (const inface of interface[name]) {
            if (inface.family === "IPv4" && !inface.internal) {
                return inface.address
            }
        }
    }
    return "Kan inte hitta IP"
}
//hälsning till Load Balancern
function reportServerIPAndID() {
    const data = JSON.stringify({
        ip: getServerIP(),
        port: portNr,
        timestamp: new Date().toISOString()
    });
    const options = {
        hostname: loadBalancerIP, // ändra till mottagande serverIP
        port: loadBalancerPortNr,
        path: '/register',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };
    const req = http.request(options, res => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
            console.log(`Svar från mottagare: ${body}`);
        });
    });

    req.on('error', error => {
        console.error('Fel vid rapportering:', error.message);
    });
    req.write(data);
    req.end();
}
//Kör hälsning en gång vid uppstart
reportServerIPAndID();


//Här införskaffar webbservern och skickar JSON-data till/från database
appDatabase.get('/table', async (req, res) => {
  try {
    // Skicka HTTP-förfrågan till databasservern
    const response = await axios.get(`http://${databaseIP}:${databasePortNr}/table`);
    res.send(response.data);
  } catch (error) {
    res.status(500).send({ error: 'Kunde inte hämta data från databasen' });
  }
});
appDatabase.post('/table', async (req, res) => {
  try {
    const newUser = req.body;

    // Skicka vidare till databasen
    const response = await axios.post(`http://${databaseIP}:${databasePortNr}/table`, newUser);

    // Returnera svaret till klienten
    res.status(201).send(response.data);
  } catch (error) {
    res.status(500).send({ error: 'Kunde inte spara användare i databasen' });
  }
});
appDatabase.listen(8100, () => {
  console.log(`Webbservern kör mot Databasen på http://${databaseIP}:${databasePortNr}`);
});

async function generateHackerCards() {
    try {
        const response = await axios.get(`http://${databaseIP}:${databasePortNr}/table`);
        const users = response.data;

        return users.map(user => `
            <div class="card">
                <h2>${user.hackerName}</h2>
                <div><span class="alias">(${user.firstName} ${user.lastName})</span></div>
                <div class="power">${user.hackerPower}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error("Kunde inte hämta data från databasservern", error);
        return `<div class="card">Kunde inte ladda hackerdata</div>`;
    }
}


app.listen(portNr, () => {
    console.log(`Servern ligger nu på ${portNr} och lyssnar`)
    console.log(`Serverns IP är; ${getServerIP()}`)
})
app.get("/health", (req, res) => {
    res.status(200).send("OK");
});
app.get("/", async (req, res)=>{
    timesResponded++
    const hackerCards = await generateHackerCards()
    let klientIP = (req.headers["x-forwarded-for"] || req.socket.remoteAddress).split(",")[0].trim()
    if (klientIP === "::1" || klientIP === "127.0.0.1"){
        klientIP = "Du kör lokalt, dvs loopback" 
    }
    res.send(`<html>
        <head>
            <title>Grupp 3s Server</title>
            <style>
                body {
                    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
                    background: #f0f2f5;
                    color: #222;
                    margin: 0;
                    padding: 40px;
                    display: flex;
                    flex-direction: row;
                    gap: 20px;
                }
                .container {
                    max-width: 600px;
                    background: white;
                    border-radius: 8px;
                    padding: 30px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                    flex: 1;
                }
                .cards {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                    flex: 1;
                }
                .card {
                    background: #ffffff;
                    border-radius: 8px;
                    padding: 20px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                    border-left: 6px solid #0055aa;
                }
                .card h2 {
                    margin: 0;
                    font-size: 18px;
                    color: #0055aa;
                }
                .card .alias {
                    font-style: italic;
                    color: #777;
                }
                .card .power {
                    margin-top: 10px;
                    color: #444;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Välkommen till Grupp 3s Server!</h1>
                <div class="info">
                    Jag har svarat <strong>${timesResponded}</strong> gånger sen jag startades.
                </div>                    
                <div class="info">
                    Jag använder port: <strong>${portNr}</strong>
                </div> 
                <div class="info">
                    Serverns IPv4-adress är: <strong>${getServerIP()}</strong>
                </div>
                <div class="info">
                    Din IPv4-adress är: <strong>${klientIP}</strong>
                </div>
            </div>

            <div class="cards">
                ${hackerCards}
            </div>
        </body>
    </html>
`)
})
