const express = require("express")
const router = express.Router()

const search_route = require("./src/routes/search-route")
router.use("/search", search_route)

const detail_route = require("./src/routes/detail.route")
router.use("/detail", detail_route)

const meta_route = require("./src/routes/meta-route")
router.use("/meta", meta_route)

module.exports = router