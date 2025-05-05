const express = require('express');
const axios = require('axios');

const app = express();

// Backend servers
const servers = [
  'http://localhost:8081',
  'http://localhost:8082'
];

// Current index of backend server
let currentIndex = 0;

// Function for getting next backend server
function getNextServer() {
  const server = servers[currentIndex];
  currentIndex = (currentIndex + 1) % servers.length;
  return server;
}

// Handler for incoming requests
app.get('', async (req, res) => {

  // Get next backend server
  const server = getNextServer();

  // Forward request
  try {
    const result = await axios.get(server + req.url);
    res.status(result.status).send(result.data);
  } catch (err) {
    res.status(500).send('Failed to connect to backend');
  }
});

app.listen(80, () => {
  console.log('Load balancer running on port 80');
});