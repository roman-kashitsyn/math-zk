"""Build the drawer's data from rendered pages, without parsing Typst source."""

from html.parser import HTMLParser
import json
import re

ARTICLE = re.compile(r"<article\b.*</article>", re.DOTALL)


class NoteText(HTMLParser):
    """Read the title and searchable card text from a semantic HTML export."""

    def __init__(self, path):
        super().__init__()
        self.in_title = False
        self.in_article = False
        self.title = []
        self.text = []
        self.feed(path.read_text(encoding="utf-8"))

    def handle_starttag(self, tag, attrs):
        if tag == "title":
            self.in_title = True
        if tag == "article":
            self.in_article = True

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False
        if tag == "article":
            self.in_article = False

    def handle_data(self, data):
        if self.in_title:
            self.title.append(data)
        if self.in_article:
            self.text.append(data)


def write_drawer_data(site, searchable_site):
    """Keep SVG card rendering, but search the equivalent HTML text and math.

    Every card already has its own page. Reuse its article on the desk, and
    leave the original pages and static index available as ordinary links.
    """
    notes = []
    for folder in ("notes", "sources", "inbox"):
        paths = (site / folder).glob("*.html")
        for path in sorted(paths):
            relative_path = path.relative_to(site)
            semantic = NoteText(searchable_site / relative_path)
            title = "".join(semantic.title).removesuffix(" · " + path.stem)
            page = path.read_text(encoding="utf-8")
            article = ARTICLE.search(page).group()
            notes.append({
                "id": path.stem,
                "title": title,
                "path": relative_path.as_posix(),
                "text": " ".join(" ".join(semantic.text).split()),
                "html": article,
            })

    def filing_order(note):
        # Numeric ID components sort numerically: 1a2 precedes 1a10.
        if note["path"].startswith("notes/"):
            parts = re.findall(r"\d+|[a-z]+", note["id"])
            return (0, tuple((0, int(p)) if p.isdigit() else (1, p) for p in parts))
        return (1 if note["path"].startswith("sources/") else 2, note["id"])

    notes.sort(key=filing_order)
    (site / "cards.json").write_text(
        json.dumps(notes, ensure_ascii=False, indent=2) + "\n", encoding="utf-8",
    )
