"""Exercise capture and filing in an isolated slip-box: python3 -m unittest discover -s tests."""

import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]


class InboxTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        shutil.copy(ROOT / "zk", self.root / "zk")
        self.env = dict(os.environ, VISUAL="", EDITOR="")

    def run_zk(self, *args, ok=True):
        result = subprocess.run([sys.executable, str(self.root / "zk"), *args],
                                cwd=self.root, env=self.env, capture_output=True, text=True)
        self.assertEqual(result.returncode == 0, ok, result.stdout + result.stderr)
        return result

    def jot(self, *args):
        return self.root / self.run_zk("jot", *args).stdout.strip()

    def test_capture_without_title_or_editor(self):
        path = self.jot()
        self.assertIn("= Untitled", path.read_text())
        self.assertIn("inbox/" + path.stem, (self.root / "build/notes.txt").read_text())

    def test_recent_first_and_exact_filing(self):
        older = self.jot("First", "-m", "A thought")
        newer = self.jot("Second", "-m", "Unicode: ∀ x\n#overleaf\nMore")
        listing = self.run_zk("inbox").stdout.splitlines()
        self.assertIn(newer.name, listing[0])
        self.assertIn(older.name, listing[1])
        original = newer.read_bytes()
        result = self.run_zk("file", "latest", "2a")
        self.assertEqual((self.root / result.stdout.strip()).read_bytes(), original)
        self.assertFalse(newer.exists())
        inventory = (self.root / "build/notes.txt").read_text()
        self.assertIn("notes/2a-second", inventory)
        self.assertNotIn(newer.stem, inventory)
        self.assertTrue(older.exists())

    def test_invalid_or_occupied_id_keeps_draft(self):
        draft = self.jot("Keep me", "-m", "Contents")
        self.run_zk("new", "2a", "Existing")
        for id_ in ("2a", "invalid", "../outside"):
            with self.subTest(id=id_):
                self.run_zk("file", "latest", id_, ok=False)
                self.assertTrue(draft.exists())
        self.assertIn("= Existing", (self.root / "notes/2a-existing.typ").read_text())

    def test_ambiguous_selector_keeps_both_drafts(self):
        first = self.jot("-m", "One")
        second = self.jot("-m", "Two")
        self.run_zk("file", first.stem[:4], "1", ok=False)
        self.assertTrue(first.exists())
        self.assertTrue(second.exists())
        self.run_zk("file", str(first.relative_to(self.root)), "1")
        self.assertFalse(first.exists())

    def test_editor_failure_preserves_capture(self):
        self.env["EDITOR"] = "/nonexistent-zk-editor"
        result = self.run_zk("jot", "Recoverable", ok=False)
        self.assertTrue((self.root / result.stdout.strip()).exists())
        self.assertIn("draft saved", result.stderr)

    def test_empty_inbox(self):
        self.assertIn("Inbox is empty", self.run_zk("inbox").stdout)
        self.run_zk("file", "latest", "1", ok=False)

    @unittest.skipUnless(shutil.which("typst"), "Typst is not installed")
    def test_drafts_compile_into_pdf_newest_first(self):
        shutil.copy(ROOT / "zk.typ", self.root / "zk.typ")
        shutil.copytree(ROOT / "lib", self.root / "lib")
        self.run_zk("new", "1", "Filed card")
        older = self.jot("Older thought", "-m", 'See #zl("1").')
        newer = self.jot("Newer thought", "-m", "Front\n#overleaf\nBack")
        self.run_zk("check")
        self.assertTrue((self.root / "build/zk.pdf").is_file())
        result = subprocess.run(["typst", "query", "zk.typ", "<zk-note-start>",
                                 "--field", "value"], cwd=self.root,
                                capture_output=True, text=True, check=True)
        records = json.loads(result.stdout)
        self.assertEqual([(r["id"], r["kind"]) for r in records],
                         [("1", "card"), ("jot-" + newer.stem, "inbox"),
                          ("jot-" + older.stem, "inbox")])


if __name__ == "__main__":
    unittest.main()
