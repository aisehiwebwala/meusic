const API_BASE_URL = "https://www.jiosaavn.com/api.php"

const FETCH = (_path, _config = { headers: { "User-Agent": "Mo" } }) => {
    return fetch(`${API_BASE_URL}/${_path}`, _config)
}

module.exports = FETCH