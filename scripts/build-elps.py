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
    data = {
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
