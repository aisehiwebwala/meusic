const express = require('express')
const path = require('path')
const app = express()

const api = require("./api")
app.use("/api", api)

const distPath = path.join(__dirname, "../FE/dist")
app.use(express.static(distPath))
app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")))

module.exports = app