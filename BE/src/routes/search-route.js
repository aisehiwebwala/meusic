const express = require("express")
const router = express.Router()

const FETCH = require("../setup/api-setup")
const default_params = require("../default-params")

const { getSongModel, getAlbumModel, getArtistModel } = require("../models/search-model")


router.get("/song", async (req, res) => {
    try {
        const { q, p, n } = req.query
        if (!q || !p || !n)
            return res.status(404).send("Invalid query!")
        const params = new URLSearchParams({ ...default_params, q, p, n, "__call": "search.getResults" })
        const response = await FETCH(`?${params.toString()}`)
        if (!response.ok)
            return res.status(response.status).send(response.statusText)
        const data = await response.json()
        const final_data = await Promise.all(data.results.map((val) => {
            return getSongModel(val)
        }))
        return res.send({ "total": data.total, "start": data.start, "results": final_data })
    } catch (error) {
        return res.status(500).send(error.message)
    }
})

router.get("/album", async (req, res) => {
    try {
        const { q, p, n } = req.query
        if (!q || !p || !n)
            return res.status(404).send("Invalid query!")
        const params = new URLSearchParams({ ...default_params, q, p, n, "__call": "search.getAlbumResults" })
        const response = await FETCH(`?${params.toString()}`)
        if (!response.ok)
            return res.status(response.status).send(response.statusText)
        const data = await response.json()
        const final_data = data.results.map((val) => {
            return getAlbumModel(val)
        })
        return res.send({ "total": data.total, "start": data.start, "results": final_data })
    } catch (error) {
        return res.status(500).send(error.message)
    }
})

router.get("/artist", async (req, res) => {
    try {
        const { q, p, n } = req.query
        if (!q || !p || !n)
            return res.status(404).send("Invalid query!")
        const params = new URLSearchParams({ ...default_params, q, p, n, "__call": "search.getArtistResults" })
        const response = await FETCH(`?${params.toString()}`)
        if (!response.ok)
            return res.status(response.status).send(response.statusText)
        const data = await response.json()
        const final_data = data.results.map((val) => {
            return getArtistModel(val)
        })
        return res.send({ "total": data.total, "start": data.start, "results": final_data })
    } catch (error) {
        return res.status(500).send(error.message)
    }
})


module.exports = router