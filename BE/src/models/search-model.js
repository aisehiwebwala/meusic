const { getDownloadURL } = require("../utils/download-url")

const getSongModel = async (data) => {
    return {
        "id": data?.id,
        "title": data?.title,
        "subtitle": data?.subtitle,
        "perma_url": data?.perma_url,
        "token": (data?.perma_url).split("/").pop(),
        "image": data?.image,
        "language": data?.language,
        "year": data?.year,
        "type":data?.type,
        "album": data?.more_info.album,
        "music": data?.music,
        "downloadURLs": await getDownloadURL(encodeURIComponent(data?.more_info?.encrypted_media_url)),
        "artists": data?.more_info?.artistMap?.primary_artists
    }
}

const getAlbumModel = (data) => {
    return {
        "id": data?.id,
        "title": data?.title,
        "subtitle": data?.subtitle,
        "perma_url": data?.perma_url,
        "token": (data?.perma_url).split("/").pop(),
        "image": data?.image,
        "language": data?.language,
        "year": data?.year,
        "type":data?.type,
        "artists": data?.more_info?.artistMap?.primary_artists
    }
}

const getArtistModel = (data) => {
    return {
        "id": data?.id,
        "name": data?.name,
        "perma_url": data?.perma_url,
        "token": (data?.perma_url).split("/").pop(),
        "image": data?.image,
        "type":data?.type
    }
}


module.exports = { getSongModel, getAlbumModel, getArtistModel }