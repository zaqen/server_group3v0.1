const express = require('express');
const axios = require('axios');
const portNr = 8080
const interval = 5000

const app = express();

const servers = [];

// Current index of backend server
let currentIndex = 0;

// Function for getting next backend server
function getNextServer() {
  currentIndex++;
  if (currentIndex >= servers.length)
  {
    currentIndex = 0;
  }
  return servers[currentIndex]
}

function addServer(aData)
{
  servers.push("http://" + aData.ip + ":" + aData.port)
  console.log("server: " + servers[servers.length-1] + " registerd")
}

// Log requests
app.use((req, res, next) => {
  console.log(`${req.method} request to ${req.url}`);
  next();
});

app.use(express.json());

app.post("/register", (req, res) => {
    addServer(req.body)
    const { ip, port, timestamp } = req.body;
    console.log(`Mottagit rapport från server: IP=${ip}, port=${port}, tid=${timestamp}`);
    res.send("Rapport mottagen.");
});

// Handler for incoming requests
app.get('{*any}', async (req, res) => {
  if (req.url === "/favicon.ico")
  {
    return
  }
  if (servers.length === 0)
  {
    res.send("no backeend servers")
    return
  }

  const server = getNextServer();

  // Forward request
  try {
    const result = await axios.get(server + req.url);
    res.status(result.status).send(result.data);
  } catch (err) {
    res.status(500).send('Failed to connect to backend');
  }
});

app.listen(portNr, () => {
  console.log(`Load balancer running on port ${portNr}`);
});

setInterval( async() => 
{
  for (let i=0;i<servers.length; i++)
  {
    try
    {
      const res = await axios.get(servers[i] + "/health")
      if (res.status !== 200)
      {
        console.log("removed server:" + servers[i] + " eror status:" + res.status)
        servers.splice(i,1)
        i--
      }
    }
    catch
    {
      console.log("removed server:" + servers[i] + " not responding")
      servers.splice(i,1)
      i--
    }
  }
}, interval);