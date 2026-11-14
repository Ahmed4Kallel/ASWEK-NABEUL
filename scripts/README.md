# Descriptions produits générées par IA

Chaque produit de la boutique possède une fichel détaillée (définition, description,
utilisations, caractéristiques, avantages, mode d'emploi, sécurité, SEO) générée par
intelligence artificielle à partir des données ASWEK.

## Comment ça fonctionne

1. **Génération (côté serveur, hors ligne)**
   Le script `scripts/generate-product-content.js` lit les produits depuis
   `js/data.js`, appelle l'API Google Gemini et écrit le résultat dans
   `data/product-content.json`.

2. **Affichage (côté navigateur)**
   `js/product.js` charge `data/product-content.json` au chargement de la page
   produit. **Aucun appel IA n'est effectué dans le navigateur** et la clé API
   n'est jamais exposée. Le contenu est mis en cache, donc pas de régénération
   à chaque clic.

Si le fichier est absent ou qu'un produit n'y figure pas, un contenu de secours
prudent est affiché (aucune donnée inventée).

## Prérequis

- Node.js 18+
- Une clé API Google Gemini dans la variable d'environnement `GEMINI_API_KEY`

```powershell
$env:GEMINI_API_KEY = "VOTRE_CLE_API"
```

## Commandes

```powershell
# Générer uniquement les produits manquants
node scripts/generate-product-content.js

# Regénérer TOUS les produits
node scripts/generate-product-content.js --force

# Regénérer certains produits seulement
node scripts/generate-product-content.js --only=aswek-soude,aswek-boytek

# Choisir un autre modèle (optionnel)
$env:GEMINI_MODEL = "gemini-flash-lite-latest"
node scripts/generate-product-content.js
```

## Règles de génération

Le prompt impose de **ne jamais inventer** de caractéristiques techniques,
dosages, temps de séchage, propriétés chimiques, prix ou performances non
vérifiables. Les informations incertaines sont signalées (« à confirmer »,
« se référer à la fiche technique / FDS »).

Les champs suivants sont produits :

| Champ | Rôle |
|-------|------|
| `definition` | Définition courte et claire (bloc « Définition ») |
| `description` | Description détaillée en plusieurs paragraphes (onglet Description) |
| `usage` | Utilisations principales (onglet Utilisations) |
| `features` | Caractéristiques vérifiables (onglet Description) |
| `advantages` | Avantages confirmés (bloc Définition) |
| `howto` | Mode d'emploi prudent (onglet Utilisations) |
| `safety` | Précautions de sécurité (onglet Sécurité) |
| `seo_title`, `seo_description`, `keywords` | SEO (title, meta, JSON-LD) |

## Ajouter un nouveau produit

1. Ajouter le produit dans `js/data.js`.
2. Lancer `node scripts/generate-product-content.js` (il ne génère que les manquants).
3. Committer `data/product-content.json`.

---

# Autres fonctionnalités IA (données pré-générées)

Toutes les fonctionnalités IA du site reposent sur des fichiers JSON générés
**hors ligne**. Le navigateur ne fait **aucun appel IA** et la clé API n'est
jamais exposée au client.

| Fonctionnalité | Script | Fichier | Affichage |
|----------------|--------|---------|-----------|
| Recherche intelligente (synonymes, intentions) | `generate-ai-rest.js` | `data/ai/smart-search.json` | `js/search.js` |
| Chatbot local (FAQ, orientation produit) | `generate-ai-quick.js` | `data/ai/chatbot-kb.json` | `js/ai/chatbot.js` |
| Descriptions courtes (accroches) | `generate-ai-quick.js` | `data/ai/short-descriptions.json` | `js/ai/enhance.js` |
| Calculateur de résine assisté | `generate-ai-rest.js` | `data/ai/resin-calculator-ai.json` | `js/product.js` |
| Recommandations produits | `generate-ai-rest.js` | `data/ai/recommendations.json` | `js/ai/product-ai.js` |
| Guides projet | `generate-ai-rest.js` | `data/ai/project-guides.json` | `guides.html` |
| Multilingue FR/AR/EN | `generate-ai-rest.js` | `data/ai/i18n.json` | `js/ai/i18n.js` |
| Synthèses d'avis | `generate-ai-rest.js` | `data/ai/review-summaries.json` | `js/ai/product-ai.js` |
| SEO + alt-text | `generate-ai-rest.js` | `data/ai/seo-alt.json` | `js/ai/product-ai.js` |
| Détection de doublons | `generate-ai-quick.js` | `data/ai/duplicates.json` | (interne, contrôle qualité) |

## Commandes

```powershell
$env:GEMINI_API_KEY = [Environment]::GetEnvironmentVariable('GEMINI_API_KEY')

# 1) Fichiers rapides : descriptions courtes, chatbot, doublons
node scripts/generate-ai-quick.js

# 2) Reste des fichiers : recherche, calculateur, recommandations, guides, i18n, avis, SEO
node scripts/generate-ai-rest.js
```

Le module partagé `scripts/generate-ai-quick.js` gère les fichiers « rapides » et
`scripts/generate-ai-rest.js` les fichiers longs. Les deux scripts réécrivent
complètement leurs fichiers respectifs à chaque exécution.

## Notes

- Les synthèses d'avis (`review-summaries.json`) sont **indicatives** : l'interface
  l'indique explicitement (« Synthèse générée par IA … avis indicatifs »).
- Les textes SEO transactionnels (« Achetez », « Prix ») sont filtrés côté client
  (`sanitize()` dans `js/ai/product-ai.js`) pour respecter le format vitrine sans prix.
- Les recommandations n'utilisent que des slugs de produits existants.

## Recherche intelligente (sans IA côté client)

| Élément | Fichier | Rôle |
|---|---|---|
| Moteur | `js/ai/search-engine.js` | Normalisation (accents, arabe), tolérance aux fautes (Levenshtein + phonétique), scoring pondéré, correction, journal des sans-résultat |
| Suggestions header | `js/ai/search-ui.js` | Panneau instantané desktop + mobile (clavier ↑ ↓ Entrée Échap) |
| Page résultats | `js/search.js` + `search.html` | Classement par pertinence, catégories suggérées, correction, état vide |
| Variantes de fautes | `data/ai/search-variants.json` | 5 à 8 graphies par produit (généré hors ligne) |
| Termes AR + EN | `data/ai/search-i18n.json` | 6 à 14 termes par produit, pondération 6 (généré par `generate-search-i18n.js`) |

Le moteur ne fait aucun appel réseau à l'exécution : il lit uniquement les JSON
locaux (`data/ai/smart-search.json`, `search-variants.json`, `seo-alt.json`,
`short-descriptions.json`) et `js/data.js`.

Journalisation des recherches sans résultat :

- côté navigateur : `localStorage` clé `aswek_search_log_v1`, consultable via
  `ASWEKSearch.exportLog()` / `ASWEKSearch.getLog()` ;
- côté serveur (facultatif) : `POST /api/search-log`, actif uniquement avec
  `node server.js` (échoue silencieusement avec un serveur statique simple).

## SEO technique

| Élément | Fichier | Détail |
|---|---|---|
| Canonical, robots, JSON-LD | `js/ai/seo.js` | Organization, WebSite + SearchAction, Product + Offer, BreadcrumbList, CollectionPage (boutique/catégorie), ItemList/HowTo (guides) |
| Métadonnées catégories | `data/ai/category-seo.json` | title, description, h1, keywords par catégorie |
| Sitemap + robots | `sitemap.xml`, `robots.txt` | générés par `scripts/generate-seo.js` |
| Serveur local + API | `server.js` | statique + journal des recherches (aucune dépendance) |

```powershell
node scripts/generate-seo.js

# Domaine de production (sitemap canonical)
$env:SITE_URL = "https://votre-domaine.tn"
node scripts/generate-seo.js

# Serveur local avec journalisation
node server.js            # http://localhost:8099
```

> **`robots.txt` : `/data/` reste explorable.** Les meta title/description, H1 et
> alt des fiches produits et catégories sont injectés par JavaScript à partir de
> `data/ai/*.json`. Bloquer `/data/` empêcherait Googlebot de rendre ces pages
> correctement (meta description vide sur les 44 fiches et les 20 catégories).
> Seul `/data/admin/` (brouillons et notes internes) est exclu.

### Recherche multilingue

```powershell
$env:GEMINI_API_KEY = [Environment]::GetEnvironmentVariable('GEMINI_API_KEY')
node scripts/generate-search-i18n.js   # data/ai/search-i18n.json (AR + EN)
```

Le script complète automatiquement les produits manquants sans écraser les
entrées déjà générées. Termes uniquement descriptifs : aucune caractéristique,
marque, dosage ou certification n'est inventée.

- Les URL existantes sont conservées : `product.html?p=<slug>` et
  `category.html?c=<id>`. Aucune URL n'est réécrite.
- Les pages `search.html` et `wishlist.html` sont en `noindex,follow` et exclues
  du sitemap.
- Les prix restent masqués dans l'interface ; ils ne figurent que dans les
  `Offer` Schema.org (données déjà présentes dans `js/data.js`).
- Multilingue : le sélecteur FR/AR/EN modifie le contenu côté client sans changer
  d'URL. Aucun `hreflang` n'est donc émis (une seule URL par page) — limitation
  volontaire pour ne pas dupliquer le contenu.

---

# Administration locale & surcharges de contenu

L'administration est **locale et hors ligne** : elle tourne sur la machine de
l'administrateur, n'est jamais déployée sur l'hébergement public, et le site
public ne lit **jamais** les données d'édition.

```
tools/admin-server.js     serveur local (127.0.0.1:8299) + API /admin/api/*
tools/admin-web/          interface (index.html, admin.css, admin.js)
data/admin/overrides.json source de vérité des surcharges (édition)
data/ai/overrides-applied.json  sortie compilée, seule lue par le site public
```

## Démarrer l'administration

```powershell
# Mot de passe explicite (recommandé)
$env:ASWEK_ADMIN_PASSWORD = "un-mot-de-passe-solide"
node tools/admin-server.js        # http://127.0.0.1:8299/admin/

# Port personnalisé
$env:ASWEK_ADMIN_PORT = "8399"
node tools/admin-server.js
```

Sans `ASWEK_ADMIN_PASSWORD`, un mot de passe est généré au premier démarrage et
écrit dans `data/admin/admin-password.txt` (à lire puis supprimer).

| Variable | Défaut | Rôle |
|---|---|---|
| `ASWEK_ADMIN_PASSWORD` | généré | Mot de passe de la session admin |
| `ASWEK_ADMIN_PORT` | `8299` | Port d'écoute (boundé à `127.0.0.1`) |
| `GEMINI_API_KEY` | — | Clé des suggestions IA (**jamais** renvoyée au navigateur) |

La session est conservée en mémoire (8 h), le mot de passe est haché, et le
réseau est limité à 5 échecs par quart d'heure.

## Fonctionnalités

- **Tableau de bord** : compteurs (produits, catégories, produits à corriger),
  journal des recherches sans résultat.
- **Produits** : filtres (SEO incomplet, synonymes insuffisants, description
  manquante, surchargé, validé), recherche, pagination.
- **Éditeur** : meta title, meta description, H1, alt principal, mots-clés
  secondaires, synonymes FR/AR/EN, définition + statut (`draft` / `approved` /
  `rejected`) et note interne.
- **Suggestions IA** : proposition de title/description/H1/alt/mots-clés par
  produit (appel Gemini côté serveur).
- **Publication** : compilation des surcharges, régénération du sitemap,
  export du jeu de surcharges.

## Flux de publication

```
data/admin/overrides.json  --(compilation)-->  data/ai/overrides-applied.json  -->  site public
```

La compilation peut être faite depuis l'onglet « Publication » de l'admin ou en
ligne de commande :

```powershell
# Simulation : affiche le rapport sans écrire
node scripts/apply-overrides.js --dry-run

# Publication réelle
node scripts/apply-overrides.js
```

Règles de compilation :

- seuls les produits **existants** (`js/data.js`) sont retenus ;
- les champs sont tronqués (title ≤ 70, description ≤ 320, H1 ≤ 90, alt ≤ 160,
  mots-clés ≤ 12, synonymes ≤ 20 par langue) ;
- une description n'est publiée que si son statut est `approved` ;
- la **note interne n'est jamais publiée** ;
- l'écriture est atomique (`.tmp` puis renommage).

## Ce qui est appliqué au site public

`js/ai/overrides.js` est chargé sur toutes les pages et applique :

| Champ | Effet |
|---|---|
| `seo_title`, `seo_desc`, `keywords` | `<title>`, meta description, meta keywords, Open Graph |
| `h1` | Titre de la fiche produit |
| `alt_main` | Attribut `alt` de l'image principale |
| `synonyms` | Termes supplémentaires dans la recherche (pondération haute) |
| `descriptions` (statut `approved`) | Bloc « Définition » et avantages de la fiche |

Le module `js/ai/product-ai.js` (SEO de base) et `js/product.js` (repli) sont
subordonnés à la surcharge : celle-ci prime toujours, et la meta description
reste identique à la description du JSON-LD.

## Audit SEO

```powershell
node scripts/audit-seo.js          # rapport console + data/admin/audit-report.json
node scripts/audit-seo.js --json   # JSON seul
```

Contrôles : title/description/H1/alt/mots-clés, description IA, synonymes
FR/AR/EN, prix, stock, images, SKU, présence dans le sitemap, doublons de nom
ou de slug, et cohérence des URL de catégories.

## Suite de non-régression

`scripts/test-site.js` rejoue les contrôles SEO, les URLs invalides, la
recherche multilingue, le cycle de publication des surcharges et les règles de
déploiement.

```powershell
# Les deux serveurs doivent tourner
node server.js                          # http://127.0.0.1:8099
$env:ASWEK_ADMIN_PASSWORD = "..." ; node tools/admin-server.js   # :8299

node scripts/test-site.js               # tout
node scripts/test-site.js seo cat       # sous-ensemble
```

Variables optionnelles : `SITE_URL`, `ADMIN_URL`, `ADMIN_PASSWORD`,
`PUPPETEER_DIR` (dossier `node_modules` contenant `puppeteer-core`),
`CHROME_PATH`.

Code de sortie `0` si tout passe, `1` sinon. La suite restaure l'état initial
(surcharges vidées) après le test de publication.

