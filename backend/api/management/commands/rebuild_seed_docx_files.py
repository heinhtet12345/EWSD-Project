from pathlib import Path
from xml.sax.saxutils import escape
from zipfile import ZIP_DEFLATED, ZipFile

from django.conf import settings
from django.core.management.base import BaseCommand


DOCUMENT_CONTENT = [
    {
        "file_name": "document1.docx",
        "idea_id": 368,
        "title": "Improve Teaching Quality with Weekly Rev Jan26 ZL1",
        "content": (
            "Implement a weekly lesson review system where teachers submit lesson plans and receive feedback. "
            "This will ensure consistent teaching quality and better alignment with learning objectives. "
            "During the 2025-2026 Jan period, Zaw Lin is suggesting that Academic Affairs Department should set clearer ownership "
            "between teams because manual tracking makes trend analysis difficult. The expected result is better visibility for "
            "managers and coordinators."
        ),
    },
    {
        "file_name": "document2.docx",
        "idea_id": 384,
        "title": "Strengthen workflow course material acce Jan26 SM2",
        "content": (
            "Our team in Quality Assurance & Evaluation could benefit from a structured approach to course material access so "
            "day-to-day work becomes easier to manage. During the 2025-2026 Jan period, Su Mon is suggesting that Quality "
            "Assurance & Evaluation should pilot a shared digital tracker because feedback is collected but not reviewed "
            "consistently. The expected result is more balanced workload across the team."
        ),
    },
    {
        "file_name": "document3.docx",
        "idea_id": 392,
        "title": "Student Wellbeing & Counseling Program Jan26 TR1",
        "content": (
            "Introduce a structured counseling program with monthly check-ins for students to support mental health, improve "
            "behavior, and enhance overall student engagement. During the 2025-2026 Jan period, Thu Rain is suggesting that "
            "Student Support Services should pilot a shared digital tracker because manual tracking makes trend analysis "
            "difficult. The expected result is more balanced workload across the team."
        ),
    },
    {
        "file_name": "document4.docx",
        "idea_id": 376,
        "title": "Curriculum Update for Industry-Relevant Jan26 WW1",
        "content": (
            "Review and update curriculum to include practical skills, digital tools, and real-world applications to better "
            "prepare students for future careers. During the 2025-2026 Jan period, Willow White is suggesting that Curriculum "
            "Development Department should pilot a shared digital tracker because manual tracking makes trend analysis difficult. "
            "The expected result is more balanced workload across the team."
        ),
    },
    {
        "file_name": "document5.docx",
        "idea_id": 401,
        "title": "Monthly Teacher Training Workshops Jan26 MM1",
        "content": (
            "Organize monthly workshops focusing on modern teaching strategies, classroom management, and technology integration "
            "to continuously improve teacher skills. During the 2025-2026 Jan period, Mona Morris is suggesting that Teacher "
            "Development & Training should standardize follow-up communication because manual tracking makes trend analysis "
            "difficult. The expected result is clearer evidence for future departmental reviews."
        ),
    },
    {
        "file_name": "document6.docx",
        "idea_id": 367,
        "title": "Improve Teaching Quality with Weekly Rev Jan26 SN1",
        "content": (
            "Implement a weekly lesson review system where teachers submit lesson plans and receive feedback. This will ensure "
            "consistent teaching quality and better alignment with learning objectives. During the 2025-2026 Jan period, Siti "
            "Nur is suggesting that Academic Affairs Department should pilot a shared digital tracker because manual tracking "
            "makes trend analysis difficult. The expected result is more balanced workload across the team."
        ),
    },
    {
        "file_name": "document7.docx",
        "idea_id": 383,
        "title": "Monthly Performance Evaluation Dashboard Jan26 SM1",
        "content": (
            "Develop a dashboard to track student performance, teacher effectiveness, and department KPIs monthly to support "
            "data-driven decision making. During the 2025-2026 Jan period, Su Mon is suggesting that Quality Assurance & "
            "Evaluation should standardize follow-up communication because manual tracking makes trend analysis difficult. The "
            "expected result is clearer evidence for future departmental reviews."
        ),
    },
    {
        "file_name": "document8.docx",
        "idea_id": 375,
        "title": "Curriculum Update for Industry-Relevant Jan26 VV1",
        "content": (
            "Review and update curriculum to include practical skills, digital tools, and real-world applications to better "
            "prepare students for future careers. During the 2025-2026 Jan period, Vincent Vaughn is suggesting that Curriculum "
            "Development Department should standardize follow-up communication because manual tracking makes trend analysis "
            "difficult. The expected result is clearer evidence for future departmental reviews."
        ),
    },
    {
        "file_name": "document9.docx",
        "idea_id": 400,
        "title": "Monthly Teacher Training Workshops Jan26 LL1",
        "content": (
            "Organize monthly workshops focusing on modern teaching strategies, classroom management, and technology integration "
            "to continuously improve teacher skills. During the 2025-2026 Jan period, Leo Lawson is suggesting that Teacher "
            "Development & Training should introduce a lightweight review step because manual tracking makes trend analysis "
            "difficult. The expected result is faster issue escalation when something slips."
        ),
    },
    {
        "file_name": "document10.docx",
        "idea_id": 391,
        "title": "Simplify program training follow-up acti Jan26 LH2",
        "content": (
            "This proposal suggests that Student Support Services should invest more attention in training follow-up activities "
            "to improve service quality and visibility. During the 2025-2026 Jan period, Lin Htet is suggesting that Student "
            "Support Services should introduce a lightweight review step because feedback is collected but not reviewed "
            "consistently. The expected result is faster issue escalation when something slips."
        ),
    },
]


CONTENT_TYPES_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>
"""

ROOT_RELS_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
"""


def build_document_xml(title: str, content: str, idea_id: int) -> str:
    lines = [
        title,
        "",
        f"Idea ID: {idea_id}",
        "",
        content,
    ]

    paragraphs = "".join(
        f"<w:p><w:r><w:t xml:space=\"preserve\">{escape(line)}</w:t></w:r></w:p>"
        for line in lines
    )

    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    {paragraphs}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>
"""


def write_docx(target_path: Path, title: str, content: str, idea_id: int) -> None:
    target_path.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(target_path, "w", compression=ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", CONTENT_TYPES_XML)
        archive.writestr("_rels/.rels", ROOT_RELS_XML)
        archive.writestr("word/document.xml", build_document_xml(title, content, idea_id))


class Command(BaseCommand):
    help = "Rebuild the seed idea documents as valid .docx files"

    def handle(self, *args, **options):
        media_dir = Path(settings.BASE_DIR) / "media" / "idea_documents"

        for item in DOCUMENT_CONTENT:
            write_docx(
                media_dir / item["file_name"],
                title=item["title"],
                content=item["content"],
                idea_id=item["idea_id"],
            )

        self.stdout.write(self.style.SUCCESS(f"Rebuilt {len(DOCUMENT_CONTENT)} valid .docx files in {media_dir}"))
