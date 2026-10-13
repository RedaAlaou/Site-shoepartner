#!/usr/bin/env python3
"""ShoePartner — génération du site statique.

Les pages s'écrivent dans _src/ar/*.html (arabe, publié à la racine) et
_src/fr/*.html (français, publié dans fr/). Chaque source commence par un
bloc de métadonnées :

    <!--meta
    title: …
    description: …
    nav: matieres          (lien de menu actif)
    three: 1               (charge Three.js et les scènes 3D)
    -->

puis le contenu de <main>. Ce script ajoute l'en-tête, le menu, le pied de
page et les scripts, et remplace les marqueurs {{…}} (icônes, WhatsApp…).

    python _build.py
"""
import re
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "_src"
V = "5"  # version des ressources (cache)

WA_NUM = "212661474232"
TEL = "+212661474232"
TEL_TXT = "06 61 47 42 32"
EMAIL = "contact@shoepartner.ma"

ARROW = '<svg class="ar" width="15" height="10" viewBox="0 0 15 10" aria-hidden="true"><path d="M0 5H13M9 1l4 4-4 4" stroke="currentColor" stroke-width="1.7" fill="none"/></svg>'
WAI = ('<svg class="wai" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"/></svg>')

# --- icônes plates, palette marine/or (viewBox 104×78) ---------------------
M, O, C = "#132A46", "#C59D53", "#F5F1E8"
D = 'stroke-dasharray="3.4 4.2" stroke-linecap="round"'
ICONS = {
    "cuir": f'<path d="M20 14c8-6 16-4 22-8 8 2 14-2 22 2 6-2 12 0 16 6 6 4 6 12 4 18 4 8 4 16-2 22-2 6-8 10-14 10-6 4-14 4-20 0-8 2-16 0-22-6-6-2-10-10-8-16-4-8-2-16 2-22 0-4-2-6 0-6Z" fill="{O}"/><path d="M26 22c10-6 30-8 44-2 10 6 14 16 10 28" fill="none" stroke="{M}" stroke-width="2.4" {D}/>',
    "simili": f'<rect x="30" y="20" width="62" height="40" fill="{M}"/><path d="M30 26h62M30 54h62" stroke="{O}" stroke-width="1.6"/><circle cx="30" cy="40" r="20" fill="{O}"/><circle cx="30" cy="40" r="13" fill="none" stroke="{M}" stroke-width="2"/><circle cx="30" cy="40" r="5" fill="{C}"/>',
    "semelles": f'<path d="M10 52c0-12 10-18 22-17l40 2c14 1 24 7 24 14 0 6-6 9-16 9H22c-8 0-12-3-12-8Z" fill="{M}"/><path d="M16 46h72" stroke="{O}" stroke-width="2.4" {D}/><path d="M24 60v6M38 60v6M52 60v6M66 60v6M80 60v6" stroke="{O}" stroke-width="3"/>',
    "metal": f'<rect x="14" y="16" width="44" height="34" rx="9" fill="none" stroke="{O}" stroke-width="6"/><path d="M36 33h30" stroke="{M}" stroke-width="5" stroke-linecap="round"/><circle cx="76" cy="22" r="8" fill="none" stroke="{M}" stroke-width="5"/><circle cx="80" cy="50" r="8" fill="none" stroke="{O}" stroke-width="5"/><circle cx="56" cy="64" r="6" fill="none" stroke="{M}" stroke-width="4"/>',
    "colles": f'<path d="M20 22c0-4 34-4 34 0v44c0 4-34 4-34 0Z" fill="{M}"/><rect x="20" y="34" width="34" height="14" fill="{O}"/><path d="M22 20c4-12 26-12 30 0" fill="none" stroke="{M}" stroke-width="2.4"/><path d="M68 34h14l4 8v26H64V42Z" fill="{O}"/><rect x="70" y="24" width="10" height="10" fill="{M}"/>',
    "fils": f'<rect x="16" y="12" width="36" height="8" fill="{M}"/><rect x="16" y="60" width="36" height="8" fill="{M}"/><rect x="21" y="20" width="26" height="40" fill="{O}"/><path d="M23 27h22M23 34h22M23 41h22M23 48h22M23 55h22" stroke="{M}" stroke-width="1.6"/><path d="M47 40c16 0 14-16 32-14" fill="none" stroke="{M}" stroke-width="2.2" {D}/><path d="M78 26l10 30" stroke="{M}" stroke-width="2"/><circle cx="88" cy="58" r="3" fill="{M}"/>',
    "mousses": f'<rect x="12" y="44" width="80" height="18" fill="{O}"/><rect x="18" y="30" width="70" height="14" fill="{M}"/><rect x="24" y="18" width="58" height="12" fill="{O}" opacity=".55"/><g fill="{M}" opacity=".45"><circle cx="24" cy="53" r="2"/><circle cx="40" cy="50" r="1.6"/><circle cx="56" cy="55" r="2"/><circle cx="74" cy="51" r="1.6"/></g>',
    "emballages": f'<path d="M14 30l38-12 38 12-38 12Z" fill="{O}"/><path d="M14 30v30l38 12V42Z" fill="{M}"/><path d="M90 30v30L52 72V42Z" fill="#1D3D63"/><rect x="60" y="50" width="20" height="8" fill="{O}" transform="skewY(-17)"/>',
    # gammes
    "ville": f'<path d="M8 56c2-8 8-10 16-12 10-2 18-10 26-20 4-4 10-4 12 0l4 8c8 4 22 8 28 14 4 4 2 10-4 10H12c-4 0-5-0-4 0Z" fill="{M}"/><path d="M8 56h84v6H8Z" fill="{O}"/><path d="M50 30l8 8M46 34l8 8M42 38l8 8" stroke="{O}" stroke-width="2.2"/>',
    "mocassin": f'<path d="M8 54c4-10 14-12 26-14 14-2 28-2 40 4 10 4 18 8 18 12v4H8Z" fill="{M}"/><path d="M8 58h84v5H8Z" fill="{O}"/><path d="M50 42c8-6 22-4 28 4" fill="none" stroke="{O}" stroke-width="2.2" {D}/><path d="M46 46h16" stroke="{O}" stroke-width="4"/>',
    "securite": f'<path d="M14 58V18h24c2 10 4 16 12 20 12 4 30 4 40 12 4 4 4 8 4 8Z" fill="{M}"/><path d="M70 42c10 2 20 6 24 16H66Z" fill="#0A1526"/><path d="M10 58h86v10H10Z" fill="{O}"/><path d="M38 24l8 4M38 30l8 4M38 36l8 4" stroke="{O}" stroke-width="2.2"/>',
    "confort": f'<path d="M10 54c2-10 10-14 22-16 8-6 16-10 26-10 14 0 28 10 34 20 2 4 0 6-4 6H10Z" fill="{O}"/><path d="M8 54h86v10c0 2-2 4-4 4H12c-2 0-4-2-4-4Z" fill="{C}" stroke="{M}" stroke-width="2"/><path d="M40 30l12 16M54 28l10 16" stroke="{M}" stroke-width="5"/>',
    "sabot": f'<path d="M10 52h84v8c0 3-2 5-5 5H15c-3 0-5-2-5-5Z" fill="{O}"/><path d="M44 52c0-14 10-24 26-24 12 0 22 8 24 20l1 4Z" fill="{M}"/><path d="M44 52c2-8 8-14 14-16" fill="none" stroke="{O}" stroke-width="2" {D}/><path d="M10 52c4-3 14-4 34 0" fill="none" stroke="{M}" stroke-width="3"/>',
    "enfant": f'<path d="M22 56c0-8 6-12 14-14 6-6 12-10 20-10 10 0 18 8 22 16 2 4 0 8-4 8Z" fill="{M}"/><path d="M20 56h62v8H20Z" fill="{O}"/><circle cx="56" cy="40" r="4" fill="{O}"/><path d="M40 38h24" stroke="{O}" stroke-width="4"/>',
    "sandale": f'<path d="M10 58c0-6 6-8 14-8h56c8 0 14 2 14 8v4H10Z" fill="{M}"/><path d="M28 50c4-14 16-20 26-20s20 8 22 20" fill="none" stroke="{O}" stroke-width="6"/><path d="M44 50c2-8 6-12 10-12" fill="none" stroke="{O}" stroke-width="4"/>',
}


def icon(k):
    return f'<svg viewBox="0 0 104 78" aria-hidden="true">{ICONS[k]}</svg>'


# --- textes de l'habillage --------------------------------------------------
NAV = {
    "fr": [("matieres", "Matières premières"), ("chaussures", "Chaussures finies"),
           ("savoir-faire", "Commander"), ("a-propos", "À propos")],
    "ar": [("matieres", "المواد الأولية"), ("chaussures", "الأحذية الجاهزة"),
           ("savoir-faire", "كيف تطلب"), ("a-propos", "من نحن")],
}
T = {
    "fr": dict(cta="Demander un prix", home="Accueil", other="العربية", other_lang="ar", other_code="AR",
               other_title="عرض الموقع بالعربية", menu_open="Ouvrir le menu", menu_close="Fermer le menu",
               home_label="Shoe Partner — accueil", nav_label="Menu principal",
               tag="Fournisseur de matières premières et de chaussures finies — Maroc.",
               f_nav="Navigation", f_cat="Catalogue", f_ct="Contact",
               cats=[("cuir", "Cuir naturel"), ("simili", "Simili cuir"), ("semelles", "Semelles"), ("metal", "Boucles & métal"),
                     ("colles", "Colles & chimie"), ("fils", "Fils à coudre"), ("mousses", "Mousses & doublures"), ("emballages", "Emballages & boîtes")],
               addr="6ᵉ étage, av. Allal Ben Abdellah, quartier L'Hippodrome — Fès", legal="Mentions légales",
               rights="© 2026 Shoe Partner SARL — Fès, Maroc", top="Retour en haut", wa="Écrire sur WhatsApp",
               wa_text="Bonjour ShoePartner, je voudrais un prix pour : "),
    "ar": dict(cta="اطلب عرض سعر", home="الرئيسية", other="Français", other_lang="fr", other_code="FR",
               other_title="Voir le site en français", menu_open="فتح القائمة", menu_close="إغلاق القائمة",
               home_label="شو بارتنر — الصفحة الرئيسية", nav_label="القائمة الرئيسية",
               tag="مورّد المواد الأولية والأحذية الجاهزة — المغرب.",
               f_nav="التصفح", f_cat="الكتالوغ", f_ct="اتصل بنا",
               cats=[("cuir", "الجلد الطبيعي"), ("simili", "الجلد الصناعي"), ("semelles", "النعال"), ("metal", "الأبازيم والإكسسوارات"),
                     ("colles", "اللواصق والمواد الكيميائية"), ("fils", "خيوط الخياطة"), ("mousses", "الإسفنج والبطانات"), ("emballages", "التغليف والعلب")],
               addr="الطابق السادس، شارع علال بن عبد الله، حي الهيبودروم — فاس", legal="المعلومات القانونية",
               rights="© 2026 Shoe Partner SARL — فاس، المغرب", top="العودة إلى الأعلى", wa="راسلنا على واتساب",
               wa_text="السلام عليكم شو بارتنر، بغيت ثمن ديال: "),
}


def wa_link(text=""):
    from urllib.parse import quote
    return f"https://wa.me/{WA_NUM}" + (f"?text={quote(text)}" if text else "")


def head(lang, meta, page, root):
    t = T[lang]
    other_href = f"fr/{page}.html" if lang == "ar" else f"../{page}.html"
    self_ar = f"{root}{page}.html" if lang == "fr" else f"{page}.html"
    self_fr = f"{page}.html" if lang == "fr" else f"fr/{page}.html"
    redirect = ""
    if lang == "ar" and page == "index":
        redirect = ("<script>\n/* L'arabe est la langue principale. Qui a choisi le français y revient directement, sans vacillement. */\n"
                    "(function(){try{if(localStorage.getItem('sp-lang')==='fr')location.replace('fr/index.html');}catch(e){}})();\n</script>\n")
    three = ""
    if meta.get("three"):
        im = root or "./"   # une importmap exige un chemin relatif explicite
        three = (f'<script type="importmap">{{"imports":{{"three":"{im}assets/vendor/three/three.module.min.js",'
                 f'"three/addons/":"{im}assets/vendor/three/addons/"}}}}</script>\n'
                 f'<link rel="modulepreload" href="{root}assets/vendor/three/three.module.min.js">\n')
    desk_nav = ""
    for k, label in NAV[lang]:
        on = k == meta.get("nav")
        desk_nav += '      <a class="nl%s" href="%s.html"%s>%s</a>\n' % (" on" if on else "", k, ' aria-current="page"' if on else "", label)
    mob_nav = "".join('  <a class="nl" href="%s.html">%s <span>0%d</span></a>\n' % (k, label, i + 1) for i, (k, label) in enumerate(NAV[lang]))
    d = 'rtl' if lang == 'ar' else 'ltr'
    loc = 'ar_MA' if lang == 'ar' else 'fr_MA'
    alt = 'fr_MA' if lang == 'ar' else 'ar_MA'
    return f"""<!DOCTYPE html>
<html lang="{lang}" dir="{d}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
{redirect}<title>{meta['title']}</title>
<meta name="description" content="{meta['description']}">
<meta property="og:title" content="{meta['title']}">
<meta property="og:description" content="{meta['description']}">
<meta property="og:type" content="website">
<meta property="og:locale" content="{loc}">
<meta property="og:locale:alternate" content="{alt}">
<meta name="theme-color" content="#132A46">
<link rel="alternate" hreflang="ar" href="{self_ar}">
<link rel="alternate" hreflang="fr" href="{self_fr}">
<link rel="alternate" hreflang="x-default" href="{self_ar}">
<link rel="icon" href="{root}assets/logo/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800&family=Inter:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=Noto+Kufi+Arabic:wght@400;500;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{root}assets/css/site.css?v={V}">
<link rel="stylesheet" href="{root}assets/css/boutique.css?v={V}">
{three}</head>
<body>

<header class="site">
  <div class="site-in">
    <a href="index.html" class="lockup" aria-label="{t['home_label']}">
      <img class="ico" src="{root}assets/logo/shoepartner-marque-couleur.svg" alt="">
      <span class="wm">Shoe Partner</span>
    </a>
    <nav class="main" aria-label="{t['nav_label']}">
{desk_nav}      <a class="btn sm" href="contact.html">{t['cta']}</a>
    </nav>
    <div class="hactions">
      <a class="lang" href="{other_href}" hreflang="{t['other_lang']}" lang="{t['other_lang']}" title="{t['other_title']}" aria-label="{t['other_title']}"><svg class="globe" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.7" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M8 1.3c2.1 2.1 2.1 11.3 0 13.4M8 1.3c-2.1 2.1-2.1 11.3 0 13.4M1.5 6h13M1.5 10h13" fill="none" stroke="currentColor" stroke-width="1.2"/></svg><span class="lang-name">{t['other']}</span><span class="lang-code">{t['other_code']}</span></a>
      <button class="burger" aria-label="{t['menu_open']}" aria-expanded="false" aria-controls="mnav">
        <svg viewBox="0 0 26 18" aria-hidden="true"><line x1="1" y1="2" x2="25" y2="2" stroke="#132A46" stroke-width="2.4" stroke-linecap="round"/><line x1="1" y1="9" x2="25" y2="9" stroke="#132A46" stroke-width="2.4" stroke-linecap="round"/><line x1="1" y1="16" x2="25" y2="16" stroke="#132A46" stroke-width="2.4" stroke-linecap="round"/></svg>
      </button>
    </div>
  </div>
</header>

<div class="mnav" id="mnav" aria-hidden="true">
  <div class="mnav-top">
    <span class="lockup"><img class="ico" src="{root}assets/logo/shoepartner-marque-couleur.svg" alt=""><span class="wm">Shoe Partner</span></span>
    <button class="close" aria-label="{t['menu_close']}"><svg viewBox="0 0 22 22" width="22" height="22" aria-hidden="true"><line x1="2" y1="2" x2="20" y2="20" stroke="#132A46" stroke-width="2.4" stroke-linecap="round"/><line x1="20" y1="2" x2="2" y2="20" stroke="#132A46" stroke-width="2.4" stroke-linecap="round"/></svg></button>
  </div>
  <a class="nl" href="index.html">{t['home']} <span>00</span></a>
{mob_nav}  <a class="nl lang-m" href="{other_href}" hreflang="{t['other_lang']}" lang="{t['other_lang']}">{t['other']} <span>{t['other_code']}</span></a>
  <a class="btn" href="contact.html">{t['cta']}</a>
</div>

<main>
"""


def foot(lang, meta, root):
    t = T[lang]
    nav = "".join(f'<li><a href="{k}.html">{label}</a></li>' for k, label in [("index", t["home"])] + NAV[lang])
    cats = "".join(f'<li><a href="matieres.html#{k}">{label}</a></li>' for k, label in t["cats"][:6])
    wa_href = wa_link(t['wa_text'])
    wa_icon = WAI.replace(' class="wai"', '')
    scripts = f'<script src="{root}assets/js/site.js?v={V}"></script>\n'
    if meta.get("three"):
        scripts += f'<script type="module" src="{root}assets/js/scenes.js?v={V}"></script>\n'
    return f"""</main>

<footer class="site">
  <div class="foot-in">
    <div class="foot-grid">
      <div class="foot-brand">
        <span class="lockup"><img class="ico" src="{root}assets/logo/shoepartner-marque-fond-fonce.svg" alt=""><span class="wm" style="--wm:var(--creme)">Shoe Partner</span></span>
        <span class="ar">شو بارتنر</span>
        <p>{t['tag']}</p>
      </div>
      <div><h4>{t['f_nav']}</h4><ul class="flinks">{nav}</ul></div>
      <div><h4>{t['f_cat']}</h4><ul class="flinks">{cats}</ul></div>
      <div>
        <h4>{t['f_ct']}</h4>
        <p class="foot-contact">
          <a href="{wa_link()}">WhatsApp · <span class="ltr">{TEL_TXT}</span></a><br>
          <a href="tel:{TEL}">{TEL_TXT}</a><br>
          <a href="mailto:{EMAIL}">{EMAIL}</a><br>
          {t['addr']}<br>
          <span class="ltr">@shoepartner.ma</span>
        </p>
      </div>
    </div>
    <div class="foot-bot">
      <span>{t['rights']}</span>
      <span><a href="contact.html#mentions">{t['legal']}</a></span>
    </div>
  </div>
</footer>

<a class="wa-float" href="{wa_href}" target="_blank" rel="noopener" aria-label="{t['wa']}">{wa_icon}</a>
<button class="totop" aria-label="{t['top']}"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 15V2M2 8l6-6 6 6" stroke="currentColor" stroke-width="2" fill="none"/></svg></button>

{scripts}</body>
</html>
"""


def fill(body, lang, root):
    t = T[lang]
    body = body.replace("{{arrow}}", ARROW).replace("{{wai}}", WAI).replace("{{root}}", root)
    body = body.replace("{{tel}}", TEL).replace("{{tel_txt}}", TEL_TXT).replace("{{email}}", EMAIL)
    body = body.replace("{{wa}}", wa_link(t["wa_text"])).replace("{{wa_num}}", WA_NUM).replace("{{addr}}", t["addr"])
    body = re.sub(r"\{\{icon:(\w+)\}\}", lambda m: icon(m.group(1)), body)
    return body


def parse(path):
    txt = path.read_text(encoding="utf-8")
    m = re.match(r"\s*<!--meta\n(.*?)\n-->\n", txt, re.S)
    meta = {}
    for line in m.group(1).splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            meta[k.strip()] = v.strip()
    return meta, txt[m.end():]


REDIRECT = """<!DOCTYPE html>
<html lang="{lang}"><head><meta charset="utf-8">
<title>Shoe Partner</title>
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url={to}">
<link rel="canonical" href="{to}">
</head><body><p><a href="{to}">{label}</a></p></body></html>
"""


def main():
    n = 0
    for lang, out_dir, root in (("ar", ROOT, ""), ("fr", ROOT / "fr", "../")):
        for src in sorted((SRC / lang).glob("*.html")):
            meta, body = parse(src)
            page = src.stem
            html = head(lang, meta, page, root) + fill(body, lang, root) + foot(lang, meta, root)
            (out_dir / f"{page}.html").write_text(html, encoding="utf-8")
            n += 1
        # l'ancienne page « plateforme » renvoie vers les chaussures finies
        (out_dir / "plateforme.html").write_text(
            REDIRECT.format(lang=lang, to="chaussures.html",
                            label="Chaussures finies" if lang == "fr" else "الأحذية الجاهزة"), encoding="utf-8")
    print(f"{n} pages générées")


if __name__ == "__main__":
    main()
