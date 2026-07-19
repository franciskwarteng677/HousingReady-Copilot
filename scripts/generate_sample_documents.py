"""Generate deterministic, fictional PDF documents for the Profile demo."""

from pathlib import Path
import sys


REPO_ROOT = Path(__file__).resolve().parents[1]
LOCAL_PACKAGES = REPO_ROOT / "tmp" / "pdfs" / "python-packages"
if LOCAL_PACKAGES.exists():
    sys.path.insert(0, str(LOCAL_PACKAGES))

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas


OUTPUT_DIR = REPO_ROOT / "public" / "sample-documents"
WIDTH, HEIGHT = letter
MARGIN = 54

INK = colors.HexColor("#153047")
INK_SOFT = colors.HexColor("#4B6477")
BRAND = colors.HexColor("#0B766E")
BRAND_SOFT = colors.HexColor("#E8F5F1")
SUN_SOFT = colors.HexColor("#FFF7DF")
LINE = colors.HexColor("#D9E2E0")
WARNING = colors.HexColor("#9F1D2D")
WARNING_SOFT = colors.HexColor("#FDEBED")
CANVAS = colors.HexColor("#F5F7F6")

SYNTHETIC_MARK = "SYNTHETIC DEMO DOCUMENT — NOT REAL APPLICANT DATA"


def new_document(path: Path, title: str) -> canvas.Canvas:
    pdf = canvas.Canvas(
        str(path),
        pagesize=letter,
        pageCompression=1,
        invariant=1,
    )
    pdf.setTitle(title)
    pdf.setAuthor("HousingReady Copilot")
    pdf.setSubject(SYNTHETIC_MARK)
    return pdf


def draw_banner(pdf: canvas.Canvas) -> None:
    pdf.setFillColor(WARNING_SOFT)
    pdf.roundRect(MARGIN, HEIGHT - 66, WIDTH - (MARGIN * 2), 30, 7, fill=1, stroke=0)
    pdf.setFillColor(WARNING)
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawCentredString(WIDTH / 2, HEIGHT - 55, SYNTHETIC_MARK)


def draw_watermark(pdf: canvas.Canvas) -> None:
    pdf.saveState()
    pdf.setFillColor(colors.HexColor("#E7ECEA"))
    pdf.setFont("Helvetica-Bold", 44)
    pdf.translate(WIDTH / 2, HEIGHT / 2)
    pdf.rotate(32)
    pdf.drawCentredString(0, 0, "SYNTHETIC DEMO")
    pdf.restoreState()


def draw_header(
    pdf: canvas.Canvas,
    organization: str,
    title: str,
    subtitle: str,
) -> float:
    draw_banner(pdf)
    draw_watermark(pdf)
    y = HEIGHT - 105
    pdf.setFillColor(BRAND)
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(MARGIN, y, organization.upper())
    y -= 29
    pdf.setFillColor(INK)
    pdf.setFont("Helvetica-Bold", 23)
    pdf.drawString(MARGIN, y, title)
    y -= 20
    pdf.setFillColor(INK_SOFT)
    pdf.setFont("Helvetica", 10)
    pdf.drawString(MARGIN, y, subtitle)
    y -= 24
    pdf.setStrokeColor(LINE)
    pdf.line(MARGIN, y, WIDTH - MARGIN, y)
    return y - 28


def draw_section_title(pdf: canvas.Canvas, title: str, y: float) -> float:
    pdf.setFillColor(INK)
    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(MARGIN, y, title.upper())
    pdf.setStrokeColor(BRAND)
    pdf.setLineWidth(2)
    pdf.line(MARGIN, y - 7, MARGIN + 34, y - 7)
    return y - 29


def draw_field_grid(
    pdf: canvas.Canvas,
    rows: list[tuple[tuple[str, str], tuple[str, str] | None]],
    y: float,
) -> float:
    column_gap = 24
    column_width = (WIDTH - (MARGIN * 2) - column_gap) / 2
    row_height = 54

    for left, right in rows:
        for column, item in enumerate((left, right)):
            if item is None:
                continue
            x = MARGIN + column * (column_width + column_gap)
            label, value = item
            pdf.setFillColor(INK_SOFT)
            pdf.setFont("Helvetica-Bold", 8)
            pdf.drawString(x, y, label.upper())
            pdf.setFillColor(INK)
            pdf.setFont("Helvetica-Bold", 11)
            pdf.drawString(x, y - 17, value)
            pdf.setStrokeColor(LINE)
            pdf.setLineWidth(1)
            pdf.line(x, y - 27, x + column_width, y - 27)
        y -= row_height
    return y


def draw_amount_cards(
    pdf: canvas.Canvas,
    amounts: list[tuple[str, str]],
    y: float,
) -> float:
    gap = 16
    card_width = (WIDTH - (MARGIN * 2) - gap) / 2
    for index, (label, value) in enumerate(amounts):
        x = MARGIN + index * (card_width + gap)
        pdf.setFillColor(BRAND_SOFT if index == 0 else CANVAS)
        pdf.roundRect(x, y - 60, card_width, 60, 8, fill=1, stroke=0)
        pdf.setFillColor(INK_SOFT)
        pdf.setFont("Helvetica-Bold", 8)
        pdf.drawString(x + 16, y - 20, label.upper())
        pdf.setFillColor(INK)
        pdf.setFont("Helvetica-Bold", 18)
        pdf.drawString(x + 16, y - 45, value)
    return y - 86


def draw_notice_box(pdf: canvas.Canvas, heading: str, body: str, y: float) -> float:
    height = 70
    pdf.setFillColor(SUN_SOFT)
    pdf.roundRect(MARGIN, y - height, WIDTH - (MARGIN * 2), height, 8, fill=1, stroke=0)
    pdf.setFillColor(INK)
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(MARGIN + 16, y - 22, heading)
    pdf.setFillColor(INK_SOFT)
    pdf.setFont("Helvetica", 9)
    pdf.drawString(MARGIN + 16, y - 42, body)
    return y - height - 24


def draw_footer(pdf: canvas.Canvas, document_date: str) -> None:
    pdf.setStrokeColor(LINE)
    pdf.line(MARGIN, 50, WIDTH - MARGIN, 50)
    pdf.setFillColor(INK_SOFT)
    pdf.setFont("Helvetica", 8)
    pdf.drawString(MARGIN, 34, f"Document date: {document_date}")
    pdf.drawRightString(
        WIDTH - MARGIN,
        34,
        "Hackathon demonstration only | Page 1 of 1",
    )


def create_pay_stub() -> None:
    path = OUTPUT_DIR / "synthetic-pay-stub.pdf"
    pdf = new_document(path, "Synthetic Pay Stub")
    y = draw_header(
        pdf,
        "Riverside Market LLC",
        "Employee pay statement",
        "Fictional payroll record prepared for the HousingReady Copilot demo.",
    )
    y = draw_section_title(pdf, "Employee and pay period", y)
    y = draw_field_grid(
        pdf,
        [
            (("Employee", "Maria Johnson"), ("Pay frequency", "Biweekly")),
            (("Pay period start", "June 1, 2026"), ("Pay period end", "June 14, 2026")),
            (("Employer", "Riverside Market LLC"), ("Document date", "June 14, 2026")),
        ],
        y,
    )
    y = draw_section_title(pdf, "Pay summary", y + 8)
    y = draw_amount_cards(
        pdf,
        [("Gross pay", "$1,620.00"), ("Net pay", "$1,318.40")],
        y,
    )
    draw_notice_box(
        pdf,
        "Synthetic record",
        "This statement is fictional and cannot be used as proof of income.",
        y,
    )
    draw_footer(pdf, "June 14, 2026")
    pdf.showPage()
    pdf.save()


def create_benefits_letter() -> None:
    path = OUTPUT_DIR / "synthetic-benefits-letter.pdf"
    pdf = new_document(path, "Synthetic Benefits Letter")
    y = draw_header(
        pdf,
        "Community Benefits Administration",
        "Benefits notice",
        "Fictional benefit information prepared for the HousingReady Copilot demo.",
    )
    y = draw_section_title(pdf, "Recipient", y)
    y = draw_field_grid(
        pdf,
        [
            (("Recipient", "Maria Johnson"), ("Letter date", "May 12, 2026")),
        ],
        y,
    )
    y = draw_section_title(pdf, "Benefit details", y + 8)
    y = draw_field_grid(
        pdf,
        [
            (("Benefit type", "Social Security"), ("Monthly benefit", "$650.00")),
            (("Effective date", "January 1, 2026"), None),
        ],
        y,
    )
    draw_notice_box(
        pdf,
        "Demonstration notice",
        "This fictional letter is not issued by a government agency and has no legal value.",
        y + 8,
    )
    draw_footer(pdf, "May 12, 2026")
    pdf.showPage()
    pdf.save()


def create_residency_document() -> None:
    path = OUTPUT_DIR / "synthetic-residency-document.pdf"
    pdf = new_document(path, "Synthetic Residency Document")
    y = draw_header(
        pdf,
        "River City Utilities",
        "Utility bill",
        "Fictional residency record prepared for the HousingReady Copilot demo.",
    )
    y = draw_section_title(pdf, "Resident and service address", y)
    y = draw_field_grid(
        pdf,
        [
            (("Resident", "Maria Johnson"), ("Document type", "Utility bill")),
            (("Issue date", "June 4, 2026"), None),
        ],
        y,
    )
    pdf.setFillColor(INK_SOFT)
    pdf.setFont("Helvetica-Bold", 8)
    pdf.drawString(MARGIN, y + 8, "ADDRESS")
    pdf.setFillColor(INK)
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(MARGIN, y - 12, "24 River Street, Cambridge, MA 02139")
    pdf.setStrokeColor(LINE)
    pdf.line(MARGIN, y - 24, WIDTH - MARGIN, y - 24)
    y -= 62
    draw_notice_box(
        pdf,
        "Synthetic record",
        "This utility bill is fictional and cannot be used as proof of residency.",
        y,
    )
    draw_footer(pdf, "June 4, 2026")
    pdf.showPage()
    pdf.save()


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    create_pay_stub()
    create_benefits_letter()
    create_residency_document()
    print(f"Generated 3 synthetic PDFs in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
