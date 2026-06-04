from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError


def download_page(url: str, output_path: Path, force: bool = False) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)

    if output_path.exists() and not force:
        print(f"Using cached page: {output_path}")
        return output_path

    print(f"Downloading: {url}")

    request = Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 RacingMuseumResearchBot/1.0"
        }
    )

    try:
        with urlopen(request, timeout=30) as response:
            html = response.read().decode("utf-8", errors="replace")
    except HTTPError as e:
        raise RuntimeError(f"HTTP error downloading {url}: {e.code}") from e
    except URLError as e:
        raise RuntimeError(f"URL error downloading {url}: {e.reason}") from e

    output_path.write_text(html, encoding="utf-8")

    print(f"Saved: {output_path}")
    return output_path