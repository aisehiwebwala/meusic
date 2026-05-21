const express = require("express")
const router = express.Router()

const search_route = require("./src/routes/search-route")
router.use("/search",search_route)

router.get("/data", (req, res) => {
    res.json({ data: 123 })
})

module.exports = router