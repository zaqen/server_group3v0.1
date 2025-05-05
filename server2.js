const express = require("express")
const os = require("os")

const app = new express()
const portNr = 8082
// const balancerIP = 192.168.1.?
var timesResponded = 0

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


app.listen(portNr, () => {
    console.log(`Servern ligger nu på ${portNr} och lyssnar`)
    console.log(`Serverns IP är; ${getServerIP()}`)
})
app.get("/health", (req, res) => {
    res.status(200).send("OK");
});
app.get("/", (req, res)=>{
    timesResponded++
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
                    }
                    .container {
                        max-width: 600px;
                        margin: auto;
                        background: white;
                        border-radius: 8px;
                        padding: 30px;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                    }
                    h1 {
                        color: #0055aa;
                        margin-bottom: 20px;
                    }
                    .info {
                        font-size: 18px;
                        margin-bottom: 10px;
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
            </body>
        </html>
    `)
})
