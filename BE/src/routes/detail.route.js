const express = require("express")
const router = express.Router()

const FETCH = require("../setup/api-setup")
const default_params = require("../default-params")

const { getSongModel, getAlbumModel } = require("../models/search-model")

router.get("/song", async (req, res) => {
    try {
        const { token } = req.query
        if (!token)
            return res.status(404).send("Invalid query!")
        const params = new URLSearchParams({ ...default_params, token, "type": "song", "__call": "webapi.get" })
        const response = await FETCH(`?${params.toString()}`)
        if (!response.ok)
            return res.status(response.status).send(response.statusText)
        const data = await response.json()
        const final_data = await Promise.all(data.songs.map((val) => {
            return getSongModel(val)
        }))
        return res.send({ "results": final_data })
    } catch (error) {
        return res.status(500).send(error.message)
    }
})

router.get("/album", async (req, res) => {
    try {
        const { token } = req.query
        if (!token)
            return res.status(404).send("Invalid query!")
        const params = new URLSearchParams({ ...default_params, token, "type": "album", "__call": "webapi.get" })
        const response = await FETCH(`?${params.toString()}`)
        if (!response.ok)
            return res.status(response.status).send(response.statusText)
        const data = await response.json()
        const final_data = await Promise.all(data.list.map((val) => {
            return getSongModel(val)
        }))
        return res.send({ ...getAlbumModel(data), "list": final_data })
    } catch (error) {
        return res.status(500).send(error.message)
    }
})

router.get("/artist", async (req, res) => {
    try {
        let { token, n, p } = req.query
        if (!token)
            return res.status(404).send("Invalid query!")
        
        n = Number(n)
        p = Number(p)
        if (!n || !p || !Number.isInteger(n) || !Number.isInteger(p)) {
            n = 20
            p = 1
        }
        const params = new URLSearchParams({ ...default_params, token, "type": "artist", "__call": "webapi.get", "includeMetaTags": 0, "sort_order": "asc", "n_album": n, "n_song": n, "p": Math.max(p-1,0) })
        const response = await FETCH(`?${params.toString()}`)
        if (!response.ok)
            return res.status(response.status).send(response.statusText)
        const data = await response.json()
        const final_songs = await Promise.all(data.topSongs.map((val)=>{
            return getSongModel(val)
        }))
        res.send({songs:final_songs,albums:data.topAlbums})

    } catch (error) {

    }
})

module.exports = router