# Editing Intelligentrix yourself

Everything is done on GitHub, in your browser, with nothing to install.
After each change, click **Commit changes**: the site updates within 1 to 2 minutes
(reload the page with Ctrl + F5 if the old version is still displayed).

| I want to… | File to edit |
|---|---|
| Add, rename or remove a tab | `site.json` + a page in `pages/` |
| Write or edit the content of an added tab | `pages/page-name.md` |
| Embed a video, form, map or chart (embed code) | the tab's `.md` page |
| Put my name and a contact on the About page | `site.json` → `about` |
| Add content (or an embed) at the bottom of the About page | `site.json` → `aboutExtra` |
| Change a text on the site (tab name, label…) | `site.json` → `texts` |
| Hide a built-in tab | `site.json` → `hideTabs` |
| Choose the default language | `site.json` → `defaultLang` |
| Change the site name or its subtitle | `site.json` → `siteName`, `siteNameAccent`, `texts` → `site.tagline` |
| Change the site colors | `site.json` → `colors` (see § 7) |

---

## 1. The `site.json` file

This is the site's settings panel. To edit it: click `site.json` in the repository, then the **pencil** icon.

```json
{
  "about": {
    "name": "Your Name",
    "contact": "address@example.org"
  },
  "defaultLang": "fr",
  "hideTabs": [],
  "tabs": [
    {
      "id": "resources",
      "title": { "fr": "Ressources", "en": "Resources" },
      "file": { "fr": "pages/resources-fr.md", "en": "pages/resources.md" }
    }
  ],
  "aboutExtra": "",
  "texts": {
    "fr": {},
    "en": {}
  }
}
```

**Three rules to avoid breaking anything** (the format is called JSON):
1. Every text goes between straight double quotes `"…"`.
2. Commas go **between** items, but **never after the last one** in a list or block.
3. Every `{` has its `}` and every `[` has its `]`.

If there is a mistake, the site stays online and shows a red banner describing the problem.
To check before saving, paste the content into **jsonlint.com**.

---

## 2. Adding a tab (3 steps)

**Step 1. Create the page.** In the repository: **Add file → Create new file**. In the file name, type
`pages/tutorials.md` (the `/` creates the folder automatically). Write the content (see § 3), then **Commit changes**.

**Step 2. Declare the tab** in `site.json`, in the `"tabs"` list:

```json
  "tabs": [
    {
      "id": "resources",
      "title": { "fr": "Ressources", "en": "Resources" },
      "file": { "fr": "pages/resources-fr.md", "en": "pages/resources.md" }
    },
    {
      "id": "tutorials",
      "title": { "fr": "Tutoriels", "en": "Tutorials" },
      "file": "pages/tutorials.md"
    }
  ],
```

- `id`: a short name, with no spaces or accents. It also gives the direct link: `https://fatip2n.github.io/biblioscope/#tutorials`.
- `title`: the name shown in the tab bar, in French and in English.
- `file`: the page to display. Either one page for both languages (`"pages/tutorials.md"`), or one per language
  (`{ "fr": "…", "en": "…" }`).
- By default the tab is placed before "About". Add `"after": "about"` to put it after.

**Step 3.** **Commit changes**. The tab appears.

To **remove** an added tab, delete its `{ … }` block from the list (and the comma before it).

---

## 3. Writing a page (Markdown)

```markdown
# Page title

A paragraph. Some **bold** text, some *italic* text, and a [link](https://example.org).

## Subtitle

- a list item
- another item

1. first step
2. second step

> A quote or a highlighted note.

![Text describing the image](https://address-of-the-image.png)
```

Leave a **blank line** between two paragraphs, before a list and before a heading.
You can also write a page in HTML: name it `.html` instead of `.md`.

**Images**: upload them to the repository (for example `images/photo.jpg` with **Add file → Upload files**),
then write `![Description](images/photo.jpg)`.

---

## 4. Embedding external content (embed code)

On YouTube, Google Forms, Google Maps, Flourish, Datawrapper, Canva, Padlet… look for **Share →
Embed**, copy the code, then paste it as is into the `.md` page, **between two blank lines**.

```markdown
## Video presentation

<div class="embed">
<iframe src="https://www.youtube.com/embed/VIDEO_ID" title="Presentation" allowfullscreen></iframe>
</div>

## Give us your feedback

<iframe src="https://docs.google.com/forms/d/e/…/viewform?embedded=true" width="100%" height="800"></iframe>
```

- `<div class="embed">` … `</div>` around a video makes it fit the screen width (16:9 format).
- For a form or a long document, keep a fixed height instead (`height="800"`).
- Codes that contain a `<script>` (Twitter/X, Flourish…) also work.

---

### World Bank charts drawn by the site

For World Bank indicators, use this line instead of an iframe (the World Bank blocks pages that load many of its
widgets at once, with the error "429 too many requests"). The site draws the chart itself, in its own colors:

```markdown
<div class="wb-chart" data-indicator="GB.XPD.RSDV.GD.ZS"></div>
```

- `data-indicator`: the indicator code, shown in the address of its page on data.worldbank.org
  (e.g. `data.worldbank.org/indicator/SP.POP.SCIE.RD.P6` → `SP.POP.SCIE.RD.P6`).
- `data-countries` (optional): 2-letter country codes, default `"MA,CA,FR,US"`.
- `data-from` (optional): first year, default `"2000"`.
- `data-per="million"` (optional): divides by the population, to get a value per million people.
- `data-world="no"` (optional): hides the world line, to compare the countries more closely.
  On any chart, visitors can also click "World" (or a country) in the legend to hide or show it.

Example: `<div class="wb-chart" data-indicator="IP.PAT.RESD" data-countries="MA,TN,DZ,EG" data-from="2010" data-per="million"></div>`

---

## 5. Changing a site text without touching the code

In `site.json`, in the `"texts"` block, give the text's **key** and its new value:

```json
  "texts": {
    "fr": { "tab.live": "Publications", "about.lead": "Ma présentation de la plateforme…" },
    "en": { "tab.live": "Publications", "about.lead": "My introduction to the platform…" }
  }
```

Most useful keys:

| Key | Text |
|---|---|
| `tab.live`, `tab.pat`, `tab.file`, `tab.about` | names of the built-in tabs |
| `about.title`, `about.lead` | title and introduction of the About page |
| `about.body` | the whole About page guide (HTML) |
| `foot.data`, `foot.method` | footer |
| `btn.analyze` | "Analyze" button |
| `k.pubs`, `k.h`, `k.cit`, `k.oa` | indicator titles |

All other keys are in `index.html`, in `const I18N = { fr: { … }, en: { … } }`
(use Ctrl + F on the current text to find its key).

---

## 6. Hiding a built-in tab

```json
  "hideTabs": ["patents"]
```

Possible names: `"live"` (live search), `"patents"`, `"worldbank"`, `"import"` (import and merge),
`"about"`. To show it again, remove it from the list: `"hideTabs": []`.

---

## 7. Changing the colors

Only the repository owner can change the colors, in `site.json`. Visitors cannot.

1. Open `site.json` in the repository and click the **pencil** icon.
2. Add (or edit) the `"colors"` block, for example right after the `"about"` block:

```json
  "colors": {
    "main": "#1C6E8C",
    "second": "#B4741C",
    "third": "#2F7D5B",
    "background": "#F2F5F6",
    "panels": "#FFFFFF",
    "text": "#13222B"
  },
```

3. Replace the codes with the colors you want, then **Commit changes**.

| Key | What it colors |
|---|---|
| `main` | buttons, links, bars, maps, the "scope" of the logo |
| `second` | patents, selected countries, highlights |
| `third` | World Bank data (map, ranking, figures and the first line of the charts) |
| `background` | page background |
| `panels` | background of the panels |
| `text` | text |

Colors are written as `"#RRGGBB"` codes: search "color picker" in Google, choose a color and copy its HEX code.
You can keep only the keys you want to change. Lighter and darker shades are computed automatically,
and dark mode gets matching colors. To choose dark-mode colors yourself, add a `"darkColors"` block with the same keys.
To go back to the original colors, delete the `"colors"` block.

---

## 8. Changing the site name

The name and its subtitle appear at the top of the page and in the browser tab. In `site.json`:

```json
  "siteName": "Intelligentrix",
  "siteNameAccent": "trix",
```

- `siteName`: the name.
- `siteNameAccent`: the end of the name shown in the main color (`""` for none).
- The subtitle is a text key: `"texts": { "fr": { "site.tagline": "…" }, "en": { "site.tagline": "…" } }`.

---

## 8. Deeper changes

Colors, layout, new charts: the source files are in `biblioscope-source.zip`
(`src/head.html` for styles and colors, `src/body.html` for the structure, `src/app.js` for the logic,
`src/i18n.js` for the texts). After editing, `python3 build.py` regenerates `index.html`.
The main colors are at the top of `src/head.html`: `--accent` (blue) and `--ochre` (ochre).

The Cloudflare proxy (`worker.js`) only needs changing when a new version is provided to you.
