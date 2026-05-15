from __future__ import annotations

import base64

from shared_schemas import LessonPack

from ..kvpack.builder import build_kvpack
from ..markdown.student_markdown import student_markdown
from ..markdown.teacher_markdown import teacher_markdown
from ..pdf.homework_card import homework_card_pdf
from ..pdf.worksheet_pdf import worksheet_pdf


class ExportService:
    async def markdown(self, pack: LessonPack) -> dict:
        return {
            "teacherMarkdown": teacher_markdown(pack),
            "studentMarkdown": student_markdown(pack),
        }

    async def pdf(self, pack: LessonPack) -> dict:
        return {
            "filename": f"{pack.id}.worksheet.pdf",
            "contentBase64": base64.b64encode(worksheet_pdf(pack)).decode("ascii"),
        }

    async def homework_card(self, pack: LessonPack, code: str | None = None) -> dict:
        return {
            "filename": f"{pack.id}.homework-card.pdf",
            "contentBase64": base64.b64encode(homework_card_pdf(pack.title, code)).decode("ascii"),
        }

    async def kvpack(self, pack: LessonPack, exported_by: str) -> dict:
        content, manifest = build_kvpack(pack, exported_by)
        return {
            "filename": f"{pack.id}.kvpack",
            "contentBase64": base64.b64encode(content).decode("ascii"),
            "manifest": manifest,
        }
