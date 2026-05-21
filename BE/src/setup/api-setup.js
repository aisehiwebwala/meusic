const API_BASE_URL = "https://www.jiosaavn.com/api.php"

const DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept-Language": "en-IN,en;q=0.9,hi;q=0.8",
    "Referer": "https://www.jiosaavn.com/",
    "Origin": "https://www.jiosaavn.com"
}

const FETCH = (_path, _config = {}) => {
    return fetch(`${API_BASE_URL}${_path}`, {
        ..._config,
        headers: { ...DEFAULT_HEADERS, ..._config.headers }
    })
}
module.exports = FETCH