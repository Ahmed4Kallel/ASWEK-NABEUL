const fs = require('fs');
const path = 'C:/Users/GIGABYTE/Downloads/resinpro';
const part1 = require(path + '/tools/_payload-part1.js');
const part2 = require(path + '/tools/_payload-part2.js');
const texts = Object.assign({}, part1, part2);

const sources = {
  'aswek-resine-epoxy-3d': ['https://resinpro.fr/max/inclusion-objet-dans-resine-epoxy/', 'https://guideresine.com/feuille-d-or-pour-resine/'],
  'aswek-vitrail-transparent': ['https://fr.lefrancbourgeois.com/products/couleurs-vitrail-incolore'],
  'aswek-boytek': ['https://boytek.com.tr/en/project/history/'],
  'aswek-silicone-pour-moule-5-kg': ['https://www.wacker.com/h/medias/6007-FR.pdf'],
  'aswek-resine-epoxy-autolissant-1-kg': ['https://www.eucochem.com/PDF/TDS/TDS_EUCOFLOOR-EP-23_FR.pdf'],
  'aswek-peinture-acrylique': ['https://fr.winsornewton.com/blogs/articles/introduction-a-la-peinture-acrylique'],
  'aswek-peinture-acrylique-gris': ['https://fr.winsornewton.com/blogs/articles/introduction-a-la-peinture-acrylique'],
  'aswek-peinture-acrylique-jaune': ['https://fr.winsornewton.com/blogs/articles/introduction-a-la-peinture-acrylique'],
  'aswek-peinture-acrylique-rouge': ['https://fr.winsornewton.com/blogs/articles/introduction-a-la-peinture-acrylique'],
  'aswek-colorant-pour-resine-epoxy': ['https://pourpoxy.com/mixing-ratio/'],
  'aswek-floculant-liquide-5l': ['https://enjeux-piscine.com/produits-et-techniques/technique/floculant-et-clarifiant-pour-quelle-action-et-pour-quel-filtre/', 'https://www.ocedis.com/fr/auxiliaires-de-filtration-floculant/1433-floculant-liquide.html'],
  'aswek-aquacid-5l': ['https://www.ocedis.com/fr/256-anti-algues', 'https://www.oseapiscine.fr/anti-algues/373-718-anti-algues-qt20.html'],
  'aswek-poly-piscine': ['https://enjeux-piscine.com/produits-et-techniques/technique/floculant-et-clarifiant-pour-quelle-action-et-pour-quel-filtre/', 'https://www.ocedis.com/fr/256-anti-algues'],
  'aswek-ph-moins-water-clean': ['https://ruedelhygiene.fr/wp-content/uploads/woocommerce_uploads/2022/10/fiche-technique-ph-moins-poudre-aquaminus-lppzzq.pdf', 'https://edg-by-aqualux.com/wp-content/uploads/2023/10/FT_107383_107384_107385_PH_MOINS_LIQUIDE_15_3359190002897_3359190002903_3359190002910_0621_EDG.pdf'],
  'aswek-ph-plus-water-clean': ['https://www.bayrol.fr/sites/bayrol/files/product_file/2020-09/pH%20Plus%20granules_Productsheet_FR.pdf', 'https://drpiscines.ch/wp-content/uploads/2022/04/PH-PLUS-POUDRE-OCEDIS-FICHE-PRODUIT.pdf'],
  'aswek-chlore-choc-5-kg': ['https://labelpiscines.fr/wp-content/uploads/2023/02/ctx200gr_CLORSHOCK_FichaTecnica_FR-1.pdf', 'https://www.edg-by-aqualux.com/wp-content/uploads/2019/12/FT_EDG_CHLORE_CHOC_GRANULES.pdf'],
  'aswek-chlore-multifonction-5kg': ['https://labelpiscines.fr/wp-content/uploads/2023/02/ctx200gr_CLORSHOCK_FichaTecnica_FR-1.pdf', 'https://www.ocedis.com/fr/256-anti-algues'],
  'aswek-poudre-metallique-nacre': ['https://www.phosphorescent.fr/resine-epoxy/539-nacres-en-poudre-pour-resine-epoxy-et-table-riviere.html', 'https://www.stardustcolors.com/resine/1387-nacres-et-pigments-pour-resine-epoxy.html'],
  'aswek-feuille-dor-100-pieces': ['https://artline-resin.eu/fr/blogs/blog/gold-leaf-techniques', 'https://guideresine.com/feuille-d-or-pour-resine/'],
  'aswek-cire-de-soja': ['https://fabrication-bougie.fr/cires/soja-ou-paraffine/', 'https://fabrication-bougie.fr/technique/temperature-de-coulee/'],
  'aswek-cire-de-paraffine': ['https://fabrication-bougie.fr/technique/temperature-de-coulee/', 'https://www.shopify.com/fr/blog/fabriquer-et-vendre-des-bougies'],
  'aswek-quartz-colore': ['https://www.quartzcolor-procyl.com/wp-content/uploads/Fiche-produit-sol-resine-saupoudre.pdf', 'https://serepp.fr/wp-content/uploads/2026/08/ft-quartz-colores.pdf'],
  'aswek-huile-de-paraffine': ['https://soapformulator.com/fr/ingredients/mineral-oil', 'https://polymerestechnologies.com/comment-bien-utiliser-l-agent-demoulant/'],
  'aswek-poudre-metallique-50-gr': ['https://chillepoxy.com/product/bronze-metallic-mica-pigment-powder-epoxy-resin/', 'https://feroca.com/fr/charges-et-alliages/37-poudre-de-cuivre-charge-metallique.html'],
  'aswek-poudre-metallique-rouge-50-gr': ['https://feroca.com/fr/charges-et-alliages/37-poudre-de-cuivre-charge-metallique.html', 'https://chillepoxy.com/product/bronze-metallic-mica-pigment-powder-epoxy-resin/'],
  'aswek-poudre-metallique-blanc-base-50-gr': ['https://www.phosphorescent.fr/resine-epoxy/539-nacres-en-poudre-pour-resine-epoxy-et-table-riviere.html', 'https://www.stardustcolors.com/resine/1387-nacres-et-pigments-pour-resine-epoxy.html'],
  'aswek-poudre-metallique-gold-50-gr': ['https://chillepoxy.com/product/bronze-metallic-mica-pigment-powder-epoxy-resin/', 'https://www.stardustcolors.com/resine/1387-nacres-et-pigments-pour-resine-epoxy.html'],
  'aswek-poudre-metallique-bronze-50-gr': ['https://feroca.com/fr/charges-et-alliages/37-poudre-de-cuivre-charge-metallique.html', 'https://chillepoxy.com/product/bronze-metallic-mica-pigment-powder-epoxy-resin/'],
  'aswek-poudre-metallique-argent-50-gr': ['https://www.stardustcolors.com/resine/1387-nacres-et-pigments-pour-resine-epoxy.html', 'https://chillepoxy.com/product/bronze-metallic-mica-pigment-powder-epoxy-resin/'],
  'aswek-pigment-phosphorescent': ['https://www.phosphorescent.fr/pigments-photoluminescents/412-pigments-photoluminescents-plastique.html', 'https://www.technoglowproducts.com/glow-powder/'],
  'aswek-silice-colore-gris': ['https://www.drizoro.com/wp-content/uploads/2023/10/ft_drizorosilicadecor_eng.pdf', 'https://www.quartzcolor-procyl.com/wp-content/uploads/Fiche-produit-sol-resine-saupoudre.pdf'],
  'aswek-silice-colore-bleu': ['https://www.drizoro.com/wp-content/uploads/2023/10/ft_drizorosilicadecor_eng.pdf', 'https://serepp.fr/wp-content/uploads/2026/08/ft-quartz-colores.pdf'],
  'aswek-silice-4mm': ['https://www.drizoro.com/wp-content/uploads/2023/10/ft_drizorosilicadecor_eng.pdf', 'https://www.quartzcolor-procyl.com/wp-content/uploads/Fiche-produit-sol-resine-saupoudre.pdf'],
  'aswek-glitter-dore': ['https://www.resomarbre.fr/pro/produit/paillette-decorative-pour-resine/', 'https://www.resinarchitecte.com/revetement/resine-flakes/'],
  'aswek-decoto-p500': ['https://www.stonesystem.it/fr/produits-decotop-spray-sols-antiderapants/', 'https://www.stonesystem.it/wp-content/uploads/Technical-data-sheet-DECOTOP-SPRAY.-Rev.-10.1-ENG.pdf'],
  'aswek-decoto-p450': ['https://www.stonesystem.it/en/decotop-overlay-stamped-concrete-overlay-products/', 'https://www.stonesystem.it/fr/produits-decotop-spray-sols-antiderapants/'],
  'aswek-vernis-var-23': ['https://www.cefora.fr/systemes/Vernis-pour-resine-epoxy', 'https://www.map-yachting.com/fr/produit/vernis-de-finition-fr/'],
  'aswek-vernis-var-27': ['https://www.pascalrosier.com/guides/guide8.htm', 'https://www.cefora.fr/systemes/Vernis-pour-resine-epoxy'],
  'aswek-diluant-4l': ['https://www.pascalrosier.com/guides/guide8.htm'],
  'aswek-diluant-0-7l': ['https://www.pascalrosier.com/guides/guide8.htm'],
  'aswek-diluant-0-4l': ['https://www.pascalrosier.com/guides/guide8.htm'],
  'aswek-diluant-0-125l': ['https://www.pascalrosier.com/guides/guide8.htm'],
  'aswek-soude': ['https://www.atelierpopulaire.fr/blog/zoom-sur-nos-cosmetiques-bio-16/zoom-sur-la-soude-568', 'https://www.inrs.fr/dam/ficheTox/FicheFicheTox/FICHETOX_20-2.pdf'],
  'aswek-deep-etanche-pro': ['https://www.eucochem.com/PDF/TDS/TDS_EUCOPROOF-MORTAR-THIX_FR.pdf', 'https://www.uniguard.me/fr/category-products/']
};

fs.mkdirSync(path + '/data/admin/backups', { recursive: true });
const backup = path + '/data/admin/backups/product-content-research-20261023-' + Date.now() + '.json';
fs.writeFileSync(backup, fs.readFileSync(path + '/data/product-content.json'), 'utf8');
const catalog = JSON.parse(fs.readFileSync(path + '/data/product-content.json', 'utf8'));
const now = new Date();
const stamp = '2026-10-23';
let applied = 0, skipped = 0, missing = [];
for (const key of Object.keys(catalog.products)) {
  const entry = texts[key];
  if (!entry) { missing.push(key); continue; }
  if (catalog.products[key].researched_at) { skipped++; continue; }
  catalog.products[key].definition = entry.definition;
  catalog.products[key].description = entry.description;
  catalog.products[key].sources = sources[key] || [];
  catalog.products[key].researched_at = stamp;
  catalog.products[key].source = 'ai:research-web-2026-10';
  catalog.products[key].generated_at = now.toISOString().slice(0, 10);
  catalog.products[key].verified = true;
  applied++;
}
fs.writeFileSync(path + '/data/product-content.json', JSON.stringify(catalog, null, 2), 'utf8');
console.log(JSON.stringify({ applied, skipped, missing, backup }));
