const express = require('express')
const app = express()

const search_route = require("./src/routes/search-route")
app.use("/search", search_route)

const detail_route = require("./src/routes/detail.route")
app.use("/detail", detail_route)

const meta_route = require("./src/routes/meta-route")
app.use("/meta", meta_route)

app.get("/",(req,res)=>{
    res.send("Hello World!")
})

module.exports = app