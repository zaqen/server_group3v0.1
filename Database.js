const express = require("express")
const fs = require('fs');
const path = require('path');
const dataPath = path.join(__dirname, 'table.json');


const app = new express()
const portNr = 8100
app.use(express.json());

app.get('/table', (req, res) => {
  fs.readFile('./table.json', 'utf8', (err, data) => {
    if (err) {
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

app.listen(portNr, () => {
  console.log(`Databasserver kör på http://localhost:${portNr}`);
});
