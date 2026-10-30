# Biblioscope

A free platform for bibliometric analysis and patent landscaping. Biblioscope maps the scientific output and
patents of a topic, a country or a set of files, using open databases and your own exports. Available in
English and French.

**Live site: https://fatip2n.github.io/biblioscope/**

**Total cost: $0.** The site is a single static page on GitHub Pages, with a small Cloudflare Worker (free plan)
that keeps API keys secret.

```
Visitor ──► GitHub Pages (index.html, static)
              │
              └──► Cloudflare Worker (worker.js, free) ── keeps the API keys secret
                     ├──► api.openalex.org   publications, citations, countries, institutions
                     ├──► ops.epo.org        EPO Open Patent Services (Espacenet data)
                     └──► api.lens.org       optional, if a Lens token is configured
```

## Features

**Live search (publications, OpenAlex)**
- Search by topic (titles and abstracts), country, period, document type and open access.
- Leave the topic empty to analyze a country's entire output: world rank, share of world output,
  partner countries and international collaboration rate.
- Compare two topics or two countries (e.g. Canada vs France).
- Annual output, world map and ranking, top institutions, research fields, journals, open access status,
  most cited publications, h-index.
- Networks in the spirit of VOSviewer: keyword co-occurrence, co-authorship between countries, authors
  and institutions.

**Patents (EPO Open Patent Services)**
- Filters: keywords (English titles and abstracts), CPC or IPC codes, applicant name, jurisdictions
  (publishing offices such as Morocco, EPO or WIPO) and publication years.
- Patents by year, world map across 100 patent offices, top applicants and their countries, CPC/IPC
  classification (subclass, group or subgroup), patent networks (co-classification, co-applicants,
  inventors, applicant countries) and latest published patents.
- Data loads progressively, with a progress bar and a loading indicator on each chart.
- A real Espacenet sample is included (100 patent families on seawater desalination, CPC C02F2103/08).

**Import and merge (Web of Science, Scopus, Publish or Perish)**
- Drop one or more exports: Web of Science (tab-delimited, plain text or Excel), Scopus (CSV),
  Publish or Perish (CSV, including Google Scholar results).
- Duplicates are matched by DOI, then by normalized title, year and first author. Similar titles are listed
  for review and never merged automatically.
- Merge report, citation indicators (h, g, m), country map, networks, and a downloadable merged CSV.
- **Files are processed in the browser and never uploaded**, which is compatible with Scopus and
  Web of Science licenses as long as raw records are not republished.

**About page** with a user guide, indicator definitions, sources and limits (link: `#about`).

## Customization (no code)

The site reads two things from the repository at load time:
- **`site.json`**: added tabs, author and contact on the About page, default language, hidden tabs and text overrides.
- **`pages/`**: one Markdown (or HTML) file per added tab. Embed codes (YouTube, Google Forms, maps, Flourish,
  Datawrapper…) can be pasted directly into these pages.

See [EDITING.md](EDITING.md) for a step-by-step guide.

## Data sources

| Source | Data | Access |
|---|---|---|
| [OpenAlex](https://openalex.org) | 300M+ scholarly works (CC0) | Free API key, $1/day of free usage |
| [EPO Open Patent Services](https://www.epo.org/en/searching-for-patents/data/web-services/ops) | Worldwide patent data (Espacenet / DOCDB) | Free account, approved by the EPO |
| [The Lens](https://www.lens.org) | Patents and scholarly works | Optional; API access on request |
| Web of Science, Scopus, Publish or Perish | Publications and citations | Through your own exports |

## Deployment

### 1. Cloudflare Worker (the proxy)
1. Create a free account on [dash.cloudflare.com](https://dash.cloudflare.com).
2. **Workers & Pages → Create → Create Worker**, name it `biblioscope`, then **Deploy**.
3. **Edit code**: replace all the code with `worker.js`, then **Deploy**.
4. **Settings → Variables and Secrets**, add:

   | Name | Type | Value |
   |---|---|---|
   | `EPO_KEY` | Secret | EPO OPS Consumer Key (developers.epo.org → My Apps) |
   | `EPO_SECRET` | Secret | EPO OPS Consumer Secret |
   | `OPENALEX_KEY` | Secret | OpenAlex key (openalex.org/settings/api) |
   | `LENS_TOKEN` | Secret | Optional, Lens.org API token |
   | `ALLOWED_ORIGIN` | Text | Your site's origin, e.g. `https://your-username.github.io` |

5. Check `https://biblioscope.<your-account>.workers.dev/health` and `/test-epo`.

### 2. GitHub Pages (the site)
1. Upload `index.html` to a public repository.
2. **Settings → Pages → Deploy from a branch**, branch `main`, folder `/ (root)`.
3. The site is live at `https://your-username.github.io/<repository>/`.

### 3. Configuration
At the top of the script in `index.html`:

```js
const SITE_CONFIG = {
  workerUrl: "https://biblioscope.<your-account>.workers.dev",
  openAlexViaWorker: true,       // use the OpenAlex key stored in the Worker
  defaultLang: "fr",             // "fr" or "en"
  about: { name: "", contact: "" } // shown at the bottom of the About page
};
```

## Worker routes

| Route | Purpose |
|---|---|
| `GET /health` | Shows which keys are configured |
| `GET /test-epo` | Checks the EPO keys and query syntax |
| `GET /openalex/...` | Relays OpenAlex requests with the stored key (cached 1 h) |
| `GET /patents?...` | Patent counts and records. Parameters: `q`, `cls` + `clsType` (cpc/ipc), `applicant`, `juris`, `from`, `to`, `part` (years, offices, total, sample), `offices`, `max` |

## Notes and limits

- **EPO counts are publications, not families.** An invention published in five offices counts five times.
  The Espacenet sample is counted in families.
- **Rate limits.** The EPO accepts 15 to 30 searches per minute. The site paces its requests, follows the
  EPO's throttling header and pauses when asked. Each count is cached by the Worker (7 days for past years,
  12 hours for the current year), so a first world analysis takes a few minutes and repeated ones are instant.
- **Keywords** are searched in English titles and abstracts; offices that publish only in their own language
  return few results. CPC/IPC codes give more complete coverage.
- **Applicants, applicant countries, classification and networks** in live EPO mode are computed on the
  bibliographic records of the first 100 families returned by the EPO.
- **Legal status** is not available in aggregate form from the EPO and is shown only when the source provides it.
- If the proxy does not respond, the site shows the last data received in the browser, with a retry button.
- Patents are published about 18 months after filing, so the two most recent years are incomplete.

## Credits

Data: [OpenAlex](https://openalex.org) (CC0), [EPO Open Patent Services](https://www.epo.org/en/searching-for-patents/data/web-services/ops),
[The Lens](https://www.lens.org). Imports: [Publish or Perish](https://harzing.com/resources/publish-or-perish),
Scopus, Web of Science. Charts: [Apache ECharts](https://echarts.apache.org).

Data shown remains subject to the terms of use of each source.
