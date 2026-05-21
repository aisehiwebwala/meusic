const express = require("express")
const router = express.Router()

const FETCH = require("../setup/api-setup")
const default_params = require("../default-params")

const { getSongModel, getAlbumModel } = require("../models/search-model")

router.get("/trending/songs", async (req, res) => {
    try {
        let { language } = req.query
        if (!language)
            language = "hindi"
        const params = new URLSearchParams({ ...default_params, "__call": "content.getTrending", "entity_type": "song", "entity_language": language })
        const response = await FETCH(`?${params.toString()}`)
        if (!response.ok)
            return res.status(response.status).send(response.statusText)
        const data = await response.json()
        const final_data = await Promise.all(data.map((val) => {
            return getSongModel(val)
        }))
        res.send({ songs: final_data })
    } catch (error) {
        return res.status(500).send(error.message)
    }
})

router.get("/trending/albums", async (req, res) => {
    try {
        let { language } = req.query
        if (!language)
            language = "hindi"
        const params = new URLSearchParams({ ...default_params, "__call": "content.getTrending", "entity_type": "album", "entity_language": language })
        const response = await FETCH(`?${params.toString()}`)
        if (!response.ok)
            return res.status(response.status).send(response.statusText)
        const data = await response.json()
        const final_data = data.map((val) => {
            return getAlbumModel(val)
        })
        res.send({ songs: final_data })
    } catch (error) {
        return res.status(500).send(error.message)
    }
})

router.get("/same-artist/songs", async (req, res) => {
    try {
        const { artist_ids, song_id } = req.query
        if (!artist_ids || !song_id)
            return res.status(404).send("Invalid query!")
        const params = new URLSearchParams({ ...default_params, "__call": "search.artistOtherTopSongs", "artist_ids": artist_ids, "song_id": song_id })
        const response = await FETCH(`?${params.toString()}`)
        if (!response.ok)
            return res.status(response.status).send(response.statusText)
        const data = await response.json()
        const final_data = await Promise.all(data.map((val) => {
            return getSongModel(val)
        }))
        res.send({ songs: final_data })
    } catch (error) {
        return res.status(500).send(error.message)
    }
})

module.exports = router