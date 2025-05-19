const express = require("express")
const fs = require('fs');
const path = require('path');
const dataPath = path.join(__dirname, 'table.json');
const mysql = require('mysql2');

const app = new express()
const portNr = 8100
app.use(express.json());

// Anslutning till databasen
const db = mysql.createConnection({
  host: 'localhost',           // eller din VM IP om den körs i en container
  user: 'ZaQen',
  password: 'hejsan123',
  database: 'hackers_db'
});

db.connect((err) => {
  if (err) {
    console.error('Kunde inte ansluta till databasen:', err);
    process.exit(1);
  }
  console.log('Ansluten till MySQL');
});

// Funktion för att hämta all data som JSON
function getHackers(callback) {
  db.query('SELECT * FROM hackers', (err, results) => {
    if (err) return callback(err, null);
    callback(null, results); // results är redan ett JSON-kompatibelt objekt
  });
}

module.exports = {
  getHackers
};


app.get('/table', (req, res) => {
  getHackers((err, data) => {
    if (err) {
      console.error('Fel vid hämtning av data:', err);
      return res.status(500).send({ error: 'Kunde inte läsa användardata' });
    }
    res.setHeader('Content-Type', 'application/json');
    res.send(data);
  });
});

app.post('/table', (req, res) => {
  const newUser = req.body;

  fs.readFile(dataPath, 'utf8', (err, data) => {
    if (err) return res.status(500).send({ error: 'Kunde inte läsa filen' });

    let table = [];
    try {
      table = JSON.parse(data);
    } catch (parseError) {
      return res.status(500).send({ error: 'Fel vid tolkning av JSON-data' });
    }

    // Automatisk ID-hantering
    const nextId = table.length ? Math.max(...table.map(u => u.id)) + 1 : 1;
    newUser.id = nextId;

    table.push(newUser);

    fs.writeFile(dataPath, JSON.stringify(table, null, 2), (writeErr) => {
      if (writeErr) return res.status(500).send({ error: 'Kunde inte spara användare' });
      res.status(201).send(newUser);
    });
  });
});


function getDBIP() {
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
  console.log(`Databasserver kör på http://${getDBIP()}:${portNr}`);
});





