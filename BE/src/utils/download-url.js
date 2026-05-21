const FETCH = require("../setup/api-setup")
const default_params = require("../default-params")

const getDownloadURL = async (url) => {
    try {
        const params = new URLSearchParams({
            ...default_params,
            url,
            "bitrate": 320,
            "__call": "song.generateAuthToken"
        })
        const response = await FETCH("?" + params.toString())
        if (!response.ok)
            return ""
        const downloadURL = (await response.json()).auth_url
        const queryIndex = downloadURL.indexOf('?')
        let dURL = (queryIndex !== -1 ? downloadURL.substring(0, queryIndex) : downloadURL).replace("web", "aac")
        return {
            "96": dURL.split('_')[0] + "_96.mp4",
            "160": dURL.split('_')[0] + "_160.mp4",
            "320": dURL.split('_')[0] + "_320.mp4"
        }
    } catch (error) {
        return ""
    }
}

module.exports = { getDownloadURL }