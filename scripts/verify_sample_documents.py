"""Validate and render the synthetic demo PDFs for visual inspection."""

from hashlib import sha256
from pathlib import Path
import sys


REPO_ROOT = Path(__file__).resolve().parents[1]
LOCAL_PACKAGES = REPO_ROOT / "tmp" / "pdfs" / "python-packages"
if LOCAL_PACKAGES.exists():
    sys.path.insert(0, str(LOCAL_PACKAGES))

import pymupdf
from pypdf import PdfReader


SAMPLES = {
    "synthetic-pay-stub.pdf": [
        "SYNTHETIC DEMO DOCUMENT — NOT REAL APPLICANT DATA",
        "Maria Johnson",
        "Riverside Market LLC",
        "June 1, 2026",
        "June 14, 2026",
        "$1,620.00",
        "$1,318.40",
        "Biweekly",
    ],
    "synthetic-benefits-letter.pdf": [
        "SYNTHETIC DEMO DOCUMENT — NOT REAL APPLICANT DATA",
        "Maria Johnson",
        "Social Security",
        "$650.00",
        "January 1, 2026",
        "May 12, 2026",
    ],
    "synthetic-residency-document.pdf": [
        "SYNTHETIC DEMO DOCUMENT — NOT REAL APPLICANT DATA",
        "Maria Johnson",
        "24 River Street, Cambridge, MA 02139",
        "Utility bill",
        "June 4, 2026",
    ],
}


def main() -> None:
    source_dir = REPO_ROOT / "public" / "sample-documents"
    render_dir = REPO_ROOT / "tmp" / "pdfs" / "rendered"
    render_dir.mkdir(parents=True, exist_ok=True)

    for filename, required_text in SAMPLES.items():
        path = source_dir / filename
        if not path.exists():
            raise FileNotFoundError(path)

        data = path.read_bytes()
        digest = sha256(data).hexdigest()
        reader = PdfReader(str(path))
        if len(reader.pages) != 1:
            raise AssertionError(f"{filename} must have exactly one page")

        extracted = reader.pages[0].extract_text()
        for expected in required_text:
            if expected not in extracted:
                raise AssertionError(f"{filename} is missing text: {expected}")

        document = pymupdf.open(str(path))
        page = document[0]
        pixmap = page.get_pixmap(matrix=pymupdf.Matrix(2, 2), alpha=False)
        output_path = render_dir / f"{path.stem}.png"
        pixmap.save(str(output_path))
        document.close()

        print(
            f"{filename} | {len(data)} bytes | 1 page | "
            f"sha256={digest} | rendered={output_path.name}"
        )


if __name__ == "__main__":
    main()
