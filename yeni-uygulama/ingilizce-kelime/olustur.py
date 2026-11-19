"""1000 kelimeyi 100 derse böler ve yazılmış ders içeriklerini JSON'a çevirir.
Çalıştırma: python3 olustur.py"""
import json, re, glob, os
D = os.path.dirname(os.path.abspath(__file__))
words = []
for f in sorted(glob.glob(f"{D}/kaynak/kelimeler-*.txt")):
    for line in open(f, encoding="utf-8"):
        line = line.rstrip("\n")
        if line:
            en, pos, tr = line.split("|")
            words.append({"en": en, "tur": pos, "tr": tr})
assert len({w["en"] for w in words}) == len(words), "tekrarlanan kelime var"
# Kolaydan zora: her türde dosya sırası korunur; bağlaç/zamir (f) ve zarflar (d) öne alınır.
BOOST = {"f": 3, "d": 3, "v": 1, "n": 1, "a": 1}
q = {p: [w for w in words if w["tur"] == p] for p in BOOST}
wt = {p: len(q[p]) * BOOST[p] for p in q}
passv = {p: 0.0 for p in q}
order = []
while len(order) < 1000:
    p = min((p for p in q if q[p]), key=lambda p: (passv[p], "fvnad".index(p)))
    order.append(q[p].pop(0)); passv[p] += 1.0 / wt[p]
lessons = [{"ders": i + 1, "kelimeler": order[i * 10:(i + 1) * 10]} for i in range(100)]
# Yazılmış dersler: icerik/ders-XX.txt -> kelime | cümle | çeviri | sözcük=anlam; ...
tok = lambda s: re.findall(r"[A-Za-z']+", s)
for f in sorted(glob.glob(f"{D}/icerik/ders-*.txt")):
    n = int(re.search(r"ders-(\d+)", f).group(1)); L = lessons[n - 1]
    rows = [l.rstrip("\n").split(" | ") for l in open(f, encoding="utf-8") if l.strip() and not l.startswith("#")]
    assert [r[0] for r in rows] == [w["en"] for w in L["kelimeler"]], f"ders {n}: kelime sırası uyuşmuyor"
    for r, w in zip(rows, L["kelimeler"]):
        assert len(r) == 4, f"ders {n}: {r[0]} satırı hatalı"
        gl = dict(x.split("=", 1) for x in r[3].split("; "))
        toks = tok(r[1])
        missing = [t for t in toks if t not in gl]; extra = [g for g in gl if g not in toks]
        assert not missing and not extra, f"ders {n} '{r[1]}': eksik {missing}, fazla {extra}"
        assert re.search(rf"\b{re.escape(w['en'])}", r[1], re.I) or n and r[0] in ("be",), f"ders {n}: '{w['en']}' cümlede yok"
        w["ornek"] = {"en": r[1], "tr": r[2], "sozcukler": [{"en": t, "tr": gl[t]} for t in toks]}
    L["hazir"] = True
json.dump({"surum": 1, "dersler": lessons}, open(f"{D}/dersler.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
if __name__ == "__main__":
    for L in lessons[:10]:
        print(L["ders"], " | ".join(w["en"] for w in L["kelimeler"]))
    print("hazır ders:", sum(1 for L in lessons if L.get("hazir")), "| kullanılmayan:", sum(len(v) for v in q.values()))
