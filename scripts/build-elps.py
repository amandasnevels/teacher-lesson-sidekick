#!/usr/bin/env python3
"""
Build src/data/elps.json from the official English Language Proficiency Standards,
19 Texas Administrative Code §74.4(c), via law.cornell.edu.

Each cross-curricular student expectation becomes one record with its code (e.g. "ELPS 3E"),
its language domain, the original wording, and an "I will ..." version.

Usage:  python3 scripts/build-elps.py [cache_dir]
"""
import importlib.util, json, os, re, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("teks", os.path.join(HERE, "build-teks.py"))
teks = importlib.util.module_from_spec(spec)
spec.loader.exec_module(teks)

DOMAINS = {"1": ("strategies", "Learning Strategies"), "2": ("listening", "Listening"), "3": ("speaking", "Speaking"), "4": ("reading", "Reading"), "5": ("writing", "Writing")}


def iwill(t):
    t = t[0].lower() + t[1:]
    return f"I will {t}."


def main():
    cache = sys.argv[1] if len(sys.argv) > 1 else ".teks-cache"
    os.makedirs(cache, exist_ok=True)
    p = teks.TacParser()
    p.feed(teks.fetch("74.4", cache))
    c = next(x for x in p.root.children if teks.clean(x.text).lower().startswith("cross-curricular second language acquisition essential knowledge"))
    items = []
    for strand in c.children:
        n = strand.designator.strip("()")
        if n not in DOMAINS:
            continue
        key, label = DOMAINS[n]
        expectation = teks.clean(strand.text)
        for se in strand.children:
            letter = se.designator.strip("()")
            if not re.fullmatch(r"[A-Z]", letter):
                continue
            text = teks.tidy_se(se.text)
            items.append({
                "id": f"74.4:{n}{letter}",
                "code": f"ELPS {n}{letter}",
                "domain": key,
                "domainLabel": label,
                "text": text,
                "iwill": iwill(text),
                "cite": f"19 TAC §74.4(c)({n})({letter})",
            })
        print(f"{label:20} {sum(1 for i in items if i['domain'] == key):3} SEs", file=sys.stderr)
    # (d) Proficiency level descriptors: domain x grade band x level, with "these students ..." bullets.
    d = next(x for x in p.root.children if teks.clean(x.text).lower().startswith("proficiency level descriptors"))
    plds = []
    level_keys = {"A": "beginning", "B": "intermediate", "C": "advanced", "D": "advancedHigh"}
    for dom in d.children:
        head = teks.clean(dom.text)
        m = re.match(r"(Listening|Speaking|Reading|Writing), (Kindergarten-Grade 12|Kindergarten-Grade 1|Grades 2-12)\.", head)
        if not m:
            continue
        band = {"Kindergarten-Grade 12": "K-12", "Kindergarten-Grade 1": "K-1", "Grades 2-12": "2-12"}[m.group(2)]
        for lv in dom.children:
            key = level_keys.get(lv.designator.strip("()"))
            if not key:
                continue
            text = teks.clean(lv.text)
            summary = re.split(r"\s+These students:?$", text)[0].strip()
            summary = re.sub(r"^(Beginning|Intermediate|Advanced high|Advanced)\.\s*", "", summary)
            bullets = [teks.tidy_se(b.text) for b in lv.children if b.designator]
            plds.append({"domain": m.group(1).lower(), "band": band, "level": key, "summary": summary, "bullets": bullets, "cite": f"19 TAC §74.4(d){dom.designator}{lv.designator}"})
    print(f"Proficiency level descriptors: {len(plds)}", file=sys.stderr)
    data = {
        "plds": plds,
        "source": "19 Texas Administrative Code §74.4 (English Language Proficiency Standards), via law.cornell.edu",
        "retrieved": time.strftime("%Y-%m-%d"),
        "items": items,
    }
    dest = os.path.join(HERE, "..", "src", "data", "elps.json")
    with open(dest, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    print(f"Wrote {len(items)} ELPS student expectations", file=sys.stderr)


if __name__ == "__main__":
    main()
