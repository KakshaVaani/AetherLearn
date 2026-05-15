from io import BytesIO

from reportlab.pdfgen import canvas
from shared_schemas import LessonPack


def worksheet_pdf(pack: LessonPack) -> bytes:
    output = BytesIO()
    pdf = canvas.Canvas(output)
    y = 760
    pdf.drawString(72, y, pack.title)
    y -= 30
    for question in pack.teacher_pack.worksheet:
        pdf.drawString(72, y, f"- {question[:90]}")
        y -= 20
    pdf.save()
    return output.getvalue()
