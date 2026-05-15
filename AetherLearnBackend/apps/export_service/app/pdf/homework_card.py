from io import BytesIO

from reportlab.pdfgen import canvas


def homework_card_pdf(title: str, code: str | None) -> bytes:
    output = BytesIO()
    pdf = canvas.Canvas(output)
    pdf.drawString(72, 760, "AetherLearn Homework Access Card")
    pdf.drawString(72, 730, title)
    pdf.drawString(72, 700, f"Access code: {code or 'not generated'}")
    pdf.save()
    return output.getvalue()
