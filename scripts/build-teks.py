#!/usr/bin/env python3
"""
Build src/data/teks.json from the official Texas Administrative Code (19 TAC Ch. 110-113),
as published by the Legal Information Institute (law.cornell.edu).

Each student expectation (SE) becomes one record with its exact TEKS code, e.g. "3.4K",
the strand it belongs to, the original wording, and an "I can ..." version of that wording.

Usage:  python3 scripts/build-teks.py [cache_dir]
"""
import html, json, os, re, sys, time, urllib.request
from html.parser import HTMLParser

BASE = "https://www.law.cornell.edu/regulations/texas/19-Tex-Admin-Code-SS-"

# (section, subject, grade band key, course label, code prefix)
SECTIONS = [
    *[(f"110.{n}", "ela", g, f"Grade {g}" if g != "K" else "Kindergarten", g) for n, g in [(2, "K"), (3, "1"), (4, "2"), (5, "3"), (6, "4"), (7, "5"), (22, "6"), (23, "7"), (24, "8")]],
    ("110.36", "ela", "HS", "English I", "E1"), ("110.37", "ela", "HS", "English II", "E2"),
    ("110.38", "ela", "HS", "English III", "E3"), ("110.39", "ela", "HS", "English IV", "E4"),
    *[(f"111.{n}", "math", g, f"Grade {g}" if g != "K" else "Kindergarten", g) for n, g in [(2, "K"), (3, "1"), (4, "2"), (5, "3"), (6, "4"), (7, "5"), (26, "6"), (27, "7"), (28, "8")]],
    ("111.39", "math", "HS", "Algebra I", "A1"), ("111.41", "math", "HS", "Geometry", "G"), ("111.40", "math", "HS", "Algebra II", "A2"),
    *[(f"112.{n}", "science", g, f"Grade {g}" if g != "K" else "Kindergarten", g) for n, g in [(2, "K"), (3, "1"), (4, "2"), (5, "3"), (6, "4"), (7, "5"), (26, "6"), (27, "7"), (28, "8")]],
    ("112.42", "science", "HS", "Biology", "B"), ("112.43", "science", "HS", "Chemistry", "C"),
    ("112.44", "science", "HS", "Integrated Physics and Chemistry", "IPC"), ("112.45", "science", "HS", "Physics", "P"),
    *[(f"113.{n}", "social", g, f"Grade {g}" if g != "K" else "Kindergarten", g) for n, g in [(11, "K"), (12, "1"), (13, "2"), (14, "3"), (15, "4"), (16, "5"), (18, "6"), (19, "7"), (20, "8")]],
    ("113.41", "social", "HS", "U.S. History Since 1877", "USH"), ("113.42", "social", "HS", "World History", "WH"),
    ("113.43", "social", "HS", "World Geography", "WG"), ("113.44", "social", "HS", "U.S. Government", "GOV"),
    ("113.31", "social", "HS", "Economics", "ECO"),
]


class Node:
    def __init__(self, depth):
        self.depth, self.designator, self.text, self.children = depth, "", "", []


class TacParser(HTMLParser):
    """Collects nested <div class="subsect indentN"> blocks with their designator and own text."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node(-1)
        self.stack = [(self.root, None)]  # (node, div depth when opened)
        self.div_depth = 0
        self.in_designator = False
        self.title = ""
        self.in_title = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "title":
            self.in_title = True
        if tag == "div":
            self.div_depth += 1
            cls = a.get("class", "")
            m = re.search(r"subsect indent(\d+)", cls)
            if m:
                node = Node(int(m.group(1)))
                self.stack[-1][0].children.append(node)
                self.stack.append((node, self.div_depth))
        if tag == "span" and "designator" in (a.get("class") or ""):
            self.in_designator = True

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False
        if tag == "span":
            self.in_designator = False
        if tag == "div":
            if self.stack[-1][1] == self.div_depth:
                self.stack.pop()
            self.div_depth -= 1

    def handle_data(self, data):
        if self.in_title:
            self.title += data
        node = self.stack[-1][0]
        if node is self.root:
            return
        if self.in_designator:
            node.designator += data.strip()
        else:
            node.text += data


def clean(t):
    t = re.sub(r"\s+", " ", t).strip()
    t = t.replace("--", "—")
    return t


def tidy_se(t):
    t = clean(t)
    t = re.sub(r"(;\s*and|;\s*or|;|\.|,)\s*$", "", t).strip()
    return t


def ican(t):
    t = t[0].lower() + t[1:] if t and not re.match(r"^[A-Z]{2}", t) else t
    return f"I can {t}."


def strand_label(t):
    t = clean(t)
    m = re.split(r"\.\s+The student", t, maxsplit=1)
    label = m[0].strip().rstrip(".")
    return label[:140]


def walk_ses(prefix, strand_no, se_node):
    """Yield (code_suffix, wording) for an SE, expanding sub-items (i), (ii) ..."""
    letter = se_node.designator.strip("()")
    stem = clean(se_node.text)
    subs = [c for c in se_node.children if c.designator]
    if not subs:
        yield f"{prefix}.{strand_no}{letter}", tidy_se(stem)
        return
    stem_core = re.sub(r"[:;]\s*$", "", stem).strip()
    for sub in subs:
        roman = sub.designator.strip("()")
        sub_text = tidy_se(sub.text)
        if sub.children:  # rare deeper nesting: fold grandchildren into the wording
            sub_text = tidy_se(sub.text + " " + "; ".join(tidy_se(g.text) for g in sub.children))
        yield f"{prefix}.{strand_no}{letter}({roman})", tidy_se(f"{stem_core} {sub_text}")


def fetch(section, cache):
    path = os.path.join(cache, section + ".html")
    if os.path.exists(path):
        return open(path, encoding="utf-8").read()
    url = BASE + section.replace(".", "-")
    req = urllib.request.Request(url, headers={"User-Agent": "teacher-sidekick-teks-builder/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        body = r.read().decode("utf-8", errors="ignore")
    open(path, "w", encoding="utf-8").write(body)
    time.sleep(0.6)
    return body


def main():
    cache = sys.argv[1] if len(sys.argv) > 1 else ".teks-cache"
    os.makedirs(cache, exist_ok=True)
    out, courses = [], []
    for section, subject, band, course, prefix in SECTIONS:
        p = TacParser()
        p.feed(fetch(section, cache))
        # Usually (b), but courses with "General requirements" put it under (c): match by heading.
        b = next((c for c in p.root.children if clean(c.text).lower().startswith("knowledge and skills")), None)
        if b is None:
            raise SystemExit(f"No knowledge and skills subsection in {section}")
        ks = b.designator.strip("()")
        count = 0
        for strand in b.children:
            n = strand.designator.strip("()")
            if not n.isdigit():
                continue
            label = strand_label(strand.text)
            for se in strand.children:
                if not re.fullmatch(r"\([A-Z]\)", se.designator):
                    continue
                for code, wording in walk_ses(prefix, n, se):
                    if not wording:
                        continue
                    out.append({
                        "id": f"{section}:{code}",
                        "code": code,
                        "subject": subject,
                        "grade": band,
                        "course": course,
                        "strand": label,
                        "text": wording,
                        "ican": ican(wording),
                        "cite": f"19 TAC §{section}({ks})({n})",
                    })
                    count += 1
        courses.append({"section": section, "subject": subject, "grade": band, "course": course, "prefix": prefix, "count": count, "title": clean(p.title).split(" | ")[0]})
        print(f"{section:7} {course:34} {count:4} SEs", file=sys.stderr)
    data = {
        "source": "19 Texas Administrative Code Chapters 110–113 (Texas Essential Knowledge and Skills), via law.cornell.edu",
        "retrieved": time.strftime("%Y-%m-%d"),
        "courses": courses,
        "items": out,
    }
    dest = os.path.join(os.path.dirname(__file__), "..", "src", "data", "teks.json")
    with open(dest, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    print(f"Wrote {len(out)} student expectations to {os.path.normpath(dest)}", file=sys.stderr)


if __name__ == "__main__":
    main()
