const express = require("express")
const router = express.Router()

const search_route = require("./src/routes/search-route")
app.use("/search", search_route)

const detail_route = require("./src/routes/detail.route")
app.use("/detail", detail_route)

const meta_route = require("./src/routes/meta-route")
app.use("/meta", meta_route)

module.exports = router