const express = require("express")
const os = require("os")
const http = require("http");
const axios = require('axios');

const app = new express()
const appDatabase = new express()

const portNr = 8081
const serverIP = getServerIP()
const databaseIP = process.argv[3];
const databasePortNr = 8100
const loadBalancerIP = process.argv[2];
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
//Hälsning till lastbalanseraren, detta är för att registrera serverns IP och portnummer
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
    // Hantera fel vid rapportering eller inmatningsfel
    req.on('error', error => {
        console.error('Fel vid rapportering:', error.message);
    });
    // Hantera odefinierad IP-adress vid uppstart
    if (loadBalancerIP === undefined) {
        console.log('Load Balancer IP är inte definierad. När du kör filen bör du skriva in lastbalanserarens IP och sedan databasens IP separerat med ett mellanslag.');
        console.error("Avslutar skriptet på grund av ogiltig IP-adress till lastbalanserare.");
        process.exit(1);
    }
    if (databaseIP === undefined) {
        console.log('Databasens IP är inte definierad. När du kör filen bör du skriva in lastbalanserarens IP och sedan databasens IP separerat med ett mellanslag.');
        console.error("Avslutar skriptet på grund av ogiltig IP-adress till databas.");
        process.exit(1);
    }
    req.write(data);
    req.end();
}
//KÖR hälsning en gång vid uppstart
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
//Oanvänd för tillfället men kan i framtiden användas för att registrera nya kort i databasens tabell
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
//Lyssnar på port 8100 för att hämta data från databasen
appDatabase.listen(8100, () => {
  console.log(`Webbservern kör mot Databasen på http://${databaseIP}:${databasePortNr}`);
});

//Hämtar data från databasen och skapar kort med informationen som kan presenteras med HTML
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

//Lyssnar på lastbalanseraren och skickar data till den
app.listen(portNr, () => {
    console.log(`Servern ligger nu på ${portNr} och lyssnar`)
    console.log(`Serverns IP är; ${getServerIP()}`)
})
//hälsocheck för att se om servern är igång, anropas av lastbalanseraren
app.get("/health", (req, res) => {
    res.status(200).send("OK");
});

//Sammanställning och presentation av hemsidan med HTML. 
//Svarsruta, hackerkort och en video som spelas upp i en iframe
app.get("/", async (req, res)=>{
    timesResponded++
    const hackerCards = await generateHackerCards()
    let klientIP = (req.headers["x-forwarded-for"] || req.socket.remoteAddress).split(",")[0].trim()
    if (klientIP === "::1" || klientIP === "127.0.0.1"){
        klientIP = "Du kör lokalt, dvs loopback" 
    }
        res.send(`
    <html>
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
                .video-container {
                    position: fixed;
                    bottom: 20px;
                    left: 20px;
                    width: 240px;
                    height: 426px;
                    box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
                    z-index: 1000;
                    border-radius: 8px;
                    overflow: hidden;
                }
                .video-container iframe {
                    width: 100%;
                    height: 100%;
                    border: none;
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

            <!-- Video Embed -->
            <div class="video-container">
                <iframe
                    src="https://www.youtube.com/embed/zZ7AimPACzc?start=26&autoplay=1&mute=1"
                    allow="autoplay; encrypted-media"
                    allowfullscreen>
                </iframe>
            </div>
        </body>
    </html>
    `);
});
