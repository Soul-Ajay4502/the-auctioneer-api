const http = require("http");

const app = require("./app");

const port = process.env.PORT || 8090;

const server = http.createServer(app);

server.listen(port);

console.log("Server Running on port " + port);
