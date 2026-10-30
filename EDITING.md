# Modifier Biblioscope vous-même

Tout se fait sur GitHub, dans votre navigateur, sans installer quoi que ce soit.
Après chaque modification, cliquez **Commit changes** : le site se met à jour en 1 à 2 minutes
(rechargez la page avec Ctrl + F5 si l'ancienne version reste affichée).

| Je veux… | Fichier à modifier |
|---|---|
| Ajouter, renommer ou retirer un onglet | `site.json` + une page dans `pages/` |
| Écrire ou modifier le contenu d'un onglet ajouté | `pages/nom-de-la-page.md` |
| Intégrer une vidéo, un formulaire, une carte, un graphique (code embed) | la page `.md` de l'onglet |
| Mettre mon nom et un contact dans « À propos » | `site.json` → `about` |
| Ajouter du contenu (ou un embed) en bas de « À propos » | `site.json` → `aboutExtra` |
| Changer un texte du site (titre d'onglet, libellé…) | `site.json` → `texts` |
| Masquer un onglet existant | `site.json` → `hideTabs` |
| Choisir la langue par défaut | `site.json` → `defaultLang` |

---

## 1. Le fichier `site.json`

C'est le panneau de réglage du site. Pour le modifier : cliquez `site.json` dans le dépôt, puis l'icône **crayon**.

```json
{
  "about": {
    "name": "Fatima Bel-Mehdi",
    "contact": "adresse@exemple.org"
  },
  "defaultLang": "fr",
  "hideTabs": [],
  "tabs": [
    {
      "id": "ressources",
      "title": { "fr": "Ressources", "en": "Resources" },
      "file": { "fr": "pages/ressources.md", "en": "pages/resources.md" }
    }
  ],
  "aboutExtra": "",
  "texts": {
    "fr": {},
    "en": {}
  }
}
```

**Trois règles pour ne rien casser** (le format s'appelle JSON) :
1. Tout texte est entre guillemets droits `"…"`.
2. Des virgules **entre** les éléments, mais **jamais après le dernier** d'une liste ou d'un bloc.
3. Chaque `{` a son `}` et chaque `[` a son `]`.

En cas d'erreur, le site reste en ligne et affiche un bandeau rouge qui indique le problème.
Pour vérifier avant d'enregistrer : copiez le contenu sur **jsonlint.com**.

---

## 2. Ajouter un onglet (3 étapes)

**Étape 1. Créer la page.** Dans le dépôt : **Add file → Create new file**. Dans le nom du fichier, tapez
`pages/tutoriels.md` (le `/` crée le dossier tout seul). Écrivez le contenu (voir § 3), puis **Commit changes**.

**Étape 2. Déclarer l'onglet** dans `site.json`, dans la liste `"tabs"` :

```json
  "tabs": [
    {
      "id": "ressources",
      "title": { "fr": "Ressources", "en": "Resources" },
      "file": { "fr": "pages/ressources.md", "en": "pages/resources.md" }
    },
    {
      "id": "tutoriels",
      "title": { "fr": "Tutoriels", "en": "Tutorials" },
      "file": "pages/tutoriels.md"
    }
  ],
```

- `id` : un nom court, sans espace ni accent. Il donne aussi le lien direct : `https://fatip2n.github.io/biblioscope/#tutoriels`.
- `title` : le nom affiché dans la barre d'onglets, en français et en anglais.
- `file` : la page à afficher. Une seule page pour les deux langues (`"pages/tutoriels.md"`), ou une par langue
  (`{ "fr": "…", "en": "…" }`).
- Par défaut l'onglet se place avant « À propos ». Ajoutez `"after": "about"` pour le mettre après.

**Étape 3.** **Commit changes**. L'onglet apparaît.

Pour **retirer** un onglet ajouté, supprimez son bloc `{ … }` de la liste (et la virgule qui le précède).

---

## 3. Écrire une page (Markdown)

```markdown
# Titre de la page

Un paragraphe. Du texte en **gras**, en *italique*, et un [lien](https://exemple.org).

## Sous-titre

- un élément de liste
- un autre élément

1. première étape
2. deuxième étape

> Une citation ou une remarque mise en avant.

![Texte décrivant l'image](https://adresse-de-l-image.png)
```

Laissez une **ligne vide** entre deux paragraphes, avant une liste et avant un titre.
Vous pouvez aussi écrire une page en HTML : nommez-la `.html` au lieu de `.md`.

**Images** : déposez-les dans le dépôt (par exemple `images/photo.jpg` avec **Add file → Upload files**),
puis écrivez `![Description](images/photo.jpg)`.

---

## 4. Intégrer un contenu externe (code embed)

Sur YouTube, Google Forms, Google Maps, Flourish, Datawrapper, Canva, Padlet… cherchez **Partager →
Intégrer** (ou *Embed*), copiez le code, puis collez-le tel quel dans la page `.md`, **entre deux lignes vides**.

```markdown
## Présentation vidéo

<div class="embed">
<iframe src="https://www.youtube.com/embed/IDENTIFIANT" title="Présentation" allowfullscreen></iframe>
</div>

## Donnez votre avis

<iframe src="https://docs.google.com/forms/d/e/…/viewform?embedded=true" width="100%" height="800"></iframe>
```

- `<div class="embed">` … `</div>` autour d'une vidéo : elle s'adapte à la largeur de l'écran (format 16/9).
- Pour un formulaire ou un document long, gardez plutôt une hauteur fixe (`height="800"`).
- Les codes qui contiennent un `<script>` (Twitter/X, Flourish…) fonctionnent aussi.

---

## 5. Changer un texte du site sans toucher au code

Dans `site.json`, bloc `"texts"`, indiquez la **clé** du texte et sa nouvelle valeur :

```json
  "texts": {
    "fr": { "tab.live": "Publications", "about.lead": "Ma présentation de la plateforme…" },
    "en": { "tab.live": "Publications" }
  }
```

Clés les plus utiles :

| Clé | Texte |
|---|---|
| `tab.live`, `tab.pat`, `tab.file`, `tab.about` | noms des onglets intégrés |
| `about.title`, `about.lead` | titre et introduction de « À propos » |
| `about.body` | tout le guide de « À propos » (HTML) |
| `foot.data`, `foot.method` | pied de page |
| `btn.analyze` | bouton « Analyser » |
| `k.pubs`, `k.h`, `k.cit`, `k.oa` | titres des indicateurs |

Toutes les autres clés se trouvent dans `index.html`, dans `const I18N = { fr: { … }, en: { … } }`
(Ctrl + F sur le texte actuel pour trouver sa clé).

---

## 6. Masquer un onglet intégré

```json
  "hideTabs": ["patents"]
```

Noms possibles : `"live"` (recherche en direct), `"patents"` (brevets), `"import"` (importer et fusionner),
`"about"` (à propos). Pour le réafficher, retirez-le de la liste : `"hideTabs": []`.

---

## 7. Modifications plus profondes

Couleurs, mise en page, nouveaux graphiques : les fichiers sources sont dans `biblioscope-source.zip`
(`src/head.html` pour les styles et couleurs, `src/body.html` pour la structure, `src/app.js` pour le fonctionnement,
`src/i18n.js` pour les textes). Après modification, `python3 build.py` régénère `index.html`.
Les couleurs principales sont en tête de `src/head.html` : `--accent` (bleu) et `--ochre` (ocre).

Le proxy Cloudflare (`worker.js`) n'est à changer que si une nouvelle version vous est fournie.
