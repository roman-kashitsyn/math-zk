"""Integration checks for Typst's experimental HTML/bundle exporter."""

from html.parser import HTMLParser
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.ids = set()
        self.links = []
        self.tags = []
        self.feed(path.read_text(encoding="utf-8"))

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.tags.append(tag)
        if "id" in attrs:
            self.ids.add(attrs["id"])
        if "href" in attrs:
            self.links.append(attrs["href"])


@unittest.skipUnless(shutil.which("typst"), "Typst is not installed")
class HtmlTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        for name in ("zk", "web.typ", "zk.typ"):
            shutil.copy(ROOT / name, self.root / name)
        shutil.copytree(ROOT / "lib", self.root / "lib")
        self.note("notes/1-root.typ", '= Root\n#tags("Lie theory & algebra")\nSee #zl("1a").')
        self.note("notes/1a-child.typ", '''= Child $CC$
#tags("Lie theory & algebra")
#defn[Let $x in RR$ and $A = mat(1, 2; 3, 4)$.]
#overleaf
#proof[$ frac(1, 2) + frac(1, 2) = 1 $]
#cite("book2000")[§2]
''')
        self.note("sources/book2000.typ", '= A book\n#source(author: [A. Author], year: 2000)')
        self.note("inbox/20261101-120000-draft.typ", '= Unfiled\nSee #zl("1a").')

    def note(self, path, body):
        file = self.root / path
        file.parent.mkdir(exist_ok=True)
        file.write_text('#import "/lib/zk.typ": *\n\n' + body, encoding="utf-8")

    def build(self, *args, ok=True):
        result = subprocess.run([sys.executable, str(self.root / "zk"), "html", *args],
                                cwd=self.root, capture_output=True, text=True)
        self.assertEqual(result.returncode == 0, ok, result.stdout + result.stderr)
        return result

    def test_math_navigation_and_document_structure(self):
        result = self.build()
        self.assertNotIn("was ignored", result.stderr)
        site = self.root / "build/site"
        pages = {p.resolve(): Page(p) for p in site.rglob("*.html")}
        self.assertEqual(len(pages), 4)
        for path, page in pages.items():
            with self.subTest(page=path.name):
                for tag in ("html", "head", "body", "title", "h1"):
                    self.assertEqual(page.tags.count(tag), 1, (tag, page.tags))
                for href in page.links:
                    url = urlsplit(href)
                    if url.scheme or url.netloc:
                        continue
                    self.assertFalse(url.path.startswith("/"), href)
                    target = (path.parent / unquote(url.path)).resolve() if url.path else path
                    self.assertTrue(target.is_file(), (path, href))
                    if url.fragment:
                        self.assertIn(unquote(url.fragment), pages[target].ids, (path, href))
        child = (site / "notes/1a.html").read_text()
        for expected in ("<math", "<mtable", "<mfrac", "<hr", "Parent:", "Sources:", "§2", "<title>Child"):
            self.assertIn(expected, child)
        source = (site / "sources/book2000.html").read_text()
        self.assertIn("Linked from:", source)
        self.assertIn("Child", source)
        self.assertNotIn("Unfiled", source)
        self.assertFalse((site / "inbox").exists())

    def test_rebuild_removes_deleted_notes_and_excluded_drafts(self):
        self.note("notes/2-removed.typ", "= Temporary")
        self.build("--include-inbox")
        site = self.root / "build/site"
        self.assertTrue((site / "inbox/jot-20261101-120000-draft.html").is_file())
        (self.root / "notes/2-removed.typ").unlink()
        self.build()
        self.assertFalse((site / "notes/2.html").exists())
        self.assertFalse((site / "inbox").exists())

    def test_broken_link_fails_without_replacing_previous_site(self):
        self.build()
        index = self.root / "build/site/index.html"
        previous = index.read_bytes()
        self.note("notes/2-broken.typ", '= Broken\n#zl("999")')
        result = self.build(ok=False)
        self.assertIn("link to unknown note 999", result.stderr)
        self.assertEqual(index.read_bytes(), previous)
        self.assertFalse((self.root / "build/site/notes/2.html").exists())


if __name__ == "__main__":
    unittest.main()
