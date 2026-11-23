/* ResinPro clone - data layer
   Categories, products and helpers shared by all pages. */

/* Category tree: top-level entries power the desktop mega-menu and mobile menu.
   Réorganisé autour du catalogue ASWEK (https://aswek.net) uniquement. */
const CATEGORIES = [
  {
    name: 'Résines',
    url: 'category.html?c=les-resines',
    groups: [
      { name: 'Résines époxy', url: 'category.html?c=resines-epoxy', items: [
        'Résine Epoxy 3D', 'Résine Epoxy Autolissant 1 Kg'
      ] },
      { name: 'Résines pour créations', url: 'category.html?c=pour-bijoux-et-creations', items: [
        'Vitrail Transparent'
      ] },
      { name: 'Peintures acryliques', url: 'category.html?c=peintures-acryliques', items: [
        'Peinture Acrylique', 'Peinture Acrylique Gris', 'Peinture Acrylique Jaune',
        'Peinture Acrylique Rouge'
      ] },
      { name: 'Colorant pour résine', url: 'category.html?c=colorant-resine', items: [
        'Colorant Pour Résine époxy'
      ] }
    ]
  },
  {
    name: 'Silicones et moules',
    url: 'category.html?c=moules-silicones',
    groups: [
      { name: 'Silicones pour moules', url: 'category.html?c=silicones-pour-moules', items: [
        'BOYTEK', 'Silicone pour moule 5 kg'
      ] },
      { name: 'Moules', url: 'category.html?c=moules', items: [
        'Moule en silicone 1', 'Moule en silicone 2',
        'Moule en silicone 3', 'Moule en silicone 4'
      ] }
    ]
  },
  {
    name: 'Colorants et Pigments',
    url: 'category.html?c=colorants-et-pigments',
    groups: [
      { name: 'Poudres métalliques et nacrées', url: 'category.html?c=poudre', items: [
        'Poudre Métallique nacré', 'Poudre Métallique 50 gr', 'Poudre Métallique Rouge',
        'Poudre Métallique Blanc ( base )', 'Poudre Métallique Gold', 'Poudre Métallique Bronze',
        'Poudre Métallique Argent'
      ] },
      { name: 'Pigments et décorations', url: 'category.html?c=pigments-decorations', items: [
        'Pigment Phosphorescent', 'Quartz coloré', 'Feuille D\'or 100 Pièces', 'Glitter doré',
        'Silice coloré', 'Silice coloré ( bleu )', 'Silice 4 mm', 'Huile de Paraffine'
      ] }
    ]
  },
  {
    name: 'Diluants et Vernis',
    url: 'category.html?c=diluants-et-vernis',
    groups: [
      { name: 'Vernis et peintures techniques', url: 'category.html?c=vernis-techniques', items: [
        'DECOTOP 500', 'DECOTOP 450', 'Vernis VAR 23', 'Vernis VAR 27'
      ] },
      { name: 'Diluants', url: 'category.html?c=diluants', items: [
        'Diluant 4 L', 'Diluant 0.7 L', 'DILUANT 0.4 L', 'Diluant 0.125 L'
      ] },
      { name: 'Entretien et nettoyage', url: 'category.html?c=entretien-nettoyage', items: [
        'SOUDE'
      ] }
    ]
  },
  {
    name: 'Bougies et Cires',
    url: 'category.html?c=bougies-et-cires',
    groups: [
      { name: 'Cires', url: 'category.html?c=cires', items: [
        'Cire de Soja', 'Cire de Paraffine'
      ] }
    ]
  },
  {
    name: 'Étanchéité',
    url: 'category.html?c=etancheite',
    groups: [
      { name: 'Étanchéité et toitures', url: 'category.html?c=etancheite-toitures', items: [
        'DEEP ETANCHE PRO'
      ] }
    ]
  },
  {
    name: 'Piscine',
    url: 'category.html?c=piscine',
    groups: [
      { name: 'Traitement de l\'eau', url: 'category.html?c=traitement-piscine', items: [
        'Floculant Liquide (5L)', 'AQUACID (5L)', 'Poly Piscine', 'pH Moins - Water clean',
        'pH Plus - Water clean', 'Chlore Choc (5 kg)', 'Chlore Multifonction (5kg)'
      ] }
    ]
  },
  {
    name: 'Aide et Assistance',
    url: '#',
    groups: [
      { name: 'AIDE ET VIDÉOS', url: '#', items: ["Vidéos d'aide", "Articles d'aide", 'Calculateur de résine', 'FAQ', 'Documents (FDS & TDS)'] },
      { name: 'SERVICE CLIENT', url: '#', items: ['Qui sommes-nous', 'Contacts', 'Livraison et retours', 'Termes et conditions', 'Détaillants / Gros consommateurs'] }
    ]
  }
];

/* Helper to build a product with a variation list */
function P(opts) {
  const p = Object.assign({
    id: 0, slug: '', name: '', cat: [], img: 'images/products/aswek/resine-epoxy-3d.png', gallery: [],
    priceFrom: 0, priceTo: 0, badge: '', badgeClass: '', rating: 0,
    short: '', features: [], variations: [], sku: '', stock: 'En stock', cur: 'TND'
  }, opts);
  // SKU unique et stable, aligne sur la valeur publiee dans le JSON-LD (aswek-<id>)
  if (!p.sku && p.id) p.sku = 'aswek-' + p.id;
  return p;
}

const PRODUCTS = [];

/* ---------------------------------------------------------------------------
   ASWEK catalogue (https://aswek.net) - intégré au système existant.
   Devise d'origine : Dinar tunisien (TND, د.ت). Les prix sont repris tels
   quels depuis la boutique ASWEK ; aucune valeur n'a été inventée.
   Les visuels sont servis localement depuis images/products/aswek/.
   --------------------------------------------------------------------------- */
const ASWEK_IMG = 'images/products/aswek/';

PRODUCTS.push(
  /* --- Collection : Résine --- */
  P({
    id: 900001, slug: 'aswek-resine-epoxy-3d',
    name: 'Résine Epoxy 3D', cat: ['aswek', 'les-resines', 'resines-epoxy'],
    img: ASWEK_IMG + 'resine-epoxy-3d.png', cur: 'TND',
    priceFrom: 45, priceTo: 48, rating: 0,
    gallery: [
      ASWEK_IMG + 'resine-epoxy-3d.png', ASWEK_IMG + 'resine-epoxy-3d-2.png',
      ASWEK_IMG + 'resine-epoxy-3d-3.png', ASWEK_IMG + 'resine-epoxy-3d-4.jpg',
      ASWEK_IMG + 'resine-epoxy-3d-5.png', ASWEK_IMG + 'resine-epoxy-3d-6.png',
      ASWEK_IMG + 'resine-epoxy-3d-7.png', ASWEK_IMG + 'resine-epoxy-3d-8.png'
    ],
    variations: [ { value: 'Standard', price: 45, id: 9000010, img: ASWEK_IMG + 'resine-epoxy-3d.png' } ]
  }),
  P({
    id: 900002, slug: 'aswek-vitrail-transparent',
    name: 'Vitrail Transparent', cat: ['aswek', 'les-resines', 'pour-bijoux-et-creations'],
    img: ASWEK_IMG + 'vitrail-transparent.jpg', cur: 'TND',
    priceFrom: 6, priceTo: 7, rating: 0,
    variations: [
      { value: '50 ml', price: 6, id: 9000020, img: ASWEK_IMG + 'vitrail-transparent.jpg' },
      { value: '100 ml', price: 7, id: 9000021, img: ASWEK_IMG + 'vitrail-transparent.jpg' }
    ]
  }),
  P({
    id: 900003, slug: 'aswek-boytek',
    name: 'BOYTEK', cat: ['aswek', 'moules-silicones', 'silicones-pour-moules'],
    img: ASWEK_IMG + 'boytek.jpg', cur: 'TND',
    priceFrom: 15, priceTo: 20, rating: 0,
    variations: [ { value: 'Standard', price: 15, id: 9000030, img: ASWEK_IMG + 'boytek.jpg' } ]
  }),
  P({
    id: 900004, slug: 'aswek-silicone-pour-moule-5-kg',
    name: 'Silicone pour moule 5 kg', cat: ['aswek', 'moules-silicones', 'silicones-pour-moules'],
    img: ASWEK_IMG + 'silicone-pour-moule-5kg.png', cur: 'TND',
    priceFrom: 400, priceTo: 415, rating: 0,
    variations: [ { value: '5 kg', price: 400, id: 9000040, img: ASWEK_IMG + 'silicone-pour-moule-5kg.png' } ]
  }),
  /* Moules en silicone : visuels fournis dans images/products/aswek/.
     Aucun prix n'est inventé : le tarif est à confirmer par ASWEK. */
  P({
    id: 900045, slug: 'aswek-moule-en-silicone-1',
    name: 'Moule en silicone 1', cat: ['aswek', 'moules-silicones', 'moules'],
    img: ASWEK_IMG + 'MOULE1.png', alt: 'Moule en silicone pour résine époxy — modèle 1', cur: 'TND',
    priceFrom: 0, priceTo: 0, rating: 0,
    short: 'Moule en silicone pour créations en résine époxy. Prix sur demande.',
    features: [
      { label: 'Matière', value: 'Silicone souple', img: '' },
      { label: 'Usage', value: 'Coulée de résine époxy', img: '' }
    ],
    gallery: [ASWEK_IMG + 'MOULE1.png'],
    variations: [ { value: 'Standard', price: 0, id: 9000450, img: ASWEK_IMG + 'MOULE1.png' } ]
  }),
  P({
    id: 900046, slug: 'aswek-moule-en-silicone-2',
    name: 'Moule en silicone 2', cat: ['aswek', 'moules-silicones', 'moules'],
    img: ASWEK_IMG + 'moule2.png', alt: 'Moule en silicone pour résine époxy — modèle 2', cur: 'TND',
    priceFrom: 0, priceTo: 0, rating: 0,
    short: 'Moule en silicone pour créations en résine époxy. Prix sur demande.',
    features: [
      { label: 'Matière', value: 'Silicone souple', img: '' },
      { label: 'Usage', value: 'Coulée de résine époxy', img: '' }
    ],
    gallery: [ASWEK_IMG + 'moule2.png'],
    variations: [ { value: 'Standard', price: 0, id: 9000460, img: ASWEK_IMG + 'moule2.png' } ]
  }),
  P({
    id: 900047, slug: 'aswek-moule-en-silicone-3',
    name: 'Moule en silicone 3', cat: ['aswek', 'moules-silicones', 'moules'],
    img: ASWEK_IMG + 'moule3.png', alt: 'Moule en silicone pour résine époxy — modèle 3', cur: 'TND',
    priceFrom: 0, priceTo: 0, rating: 0,
    short: 'Moule en silicone pour créations en résine époxy. Prix sur demande.',
    features: [
      { label: 'Matière', value: 'Silicone souple', img: '' },
      { label: 'Usage', value: 'Coulée de résine époxy', img: '' }
    ],
    gallery: [ASWEK_IMG + 'moule3.png'],
    variations: [ { value: 'Standard', price: 0, id: 9000470, img: ASWEK_IMG + 'moule3.png' } ]
  }),
  P({
    id: 900048, slug: 'aswek-moule-en-silicone-4',
    name: 'Moule en silicone 4', cat: ['aswek', 'moules-silicones', 'moules'],
    img: ASWEK_IMG + 'moule4.png', alt: 'Moule en silicone pour résine époxy — modèle 4', cur: 'TND',
    priceFrom: 0, priceTo: 0, rating: 0,
    short: 'Moule en silicone pour créations en résine époxy. Prix sur demande.',
    features: [
      { label: 'Matière', value: 'Silicone souple', img: '' },
      { label: 'Usage', value: 'Coulée de résine époxy', img: '' }
    ],
    gallery: [ASWEK_IMG + 'moule4.png'],
    variations: [ { value: 'Standard', price: 0, id: 9000480, img: ASWEK_IMG + 'moule4.png' } ]
  }),
  P({
    id: 900005, slug: 'aswek-resine-epoxy-autolissant-1-kg',
    name: 'Résine Epoxy Autolissant 1 Kg', cat: ['aswek', 'les-resines', 'resines-epoxy'],
    img: ASWEK_IMG + 'resine-epoxy-autolissant-1kg.png', cur: 'TND',
    priceFrom: 35, priceTo: 37, rating: 0,
    variations: [ { value: '1 kg', price: 35, id: 9000050, img: ASWEK_IMG + 'resine-epoxy-autolissant-1kg.png' } ]
  }),
  P({
    id: 900006, slug: 'aswek-peinture-acrylique',
    name: 'Peinture Acrylique', cat: ['aswek', 'les-resines', 'peintures-acryliques'],
    img: ASWEK_IMG + 'peinture-acrylique.jpg', cur: 'TND',
    priceFrom: 18, priceTo: 18, rating: 0,
    variations: [ { value: 'Standard', price: 18, id: 9000060, img: ASWEK_IMG + 'peinture-acrylique.jpg' } ]
  }),
  P({
    id: 900007, slug: 'aswek-peinture-acrylique-gris',
    name: 'Peinture Acrylique Gris', cat: ['aswek', 'les-resines', 'peintures-acryliques'],
    img: ASWEK_IMG + 'peinture-acrylique-gris.png', cur: 'TND',
    priceFrom: 18, priceTo: 18, rating: 0,
    variations: [ { value: 'Gris', price: 18, id: 9000070, img: ASWEK_IMG + 'peinture-acrylique-gris.png' } ]
  }),
  P({
    id: 900008, slug: 'aswek-peinture-acrylique-jaune',
    name: 'Peinture Acrylique Jaune', cat: ['aswek', 'les-resines', 'peintures-acryliques'],
    img: ASWEK_IMG + 'peinture-acrylique-jaune.png', cur: 'TND',
    priceFrom: 20, priceTo: 20, rating: 0,
    variations: [ { value: 'Jaune', price: 20, id: 9000080, img: ASWEK_IMG + 'peinture-acrylique-jaune.png' } ]
  }),
  P({
    id: 900009, slug: 'aswek-peinture-acrylique-rouge',
    name: 'Peinture Acrylique Rouge', cat: ['aswek', 'les-resines', 'peintures-acryliques'],
    img: ASWEK_IMG + 'peinture-acrylique-rouge.png', cur: 'TND',
    priceFrom: 20, priceTo: 20, rating: 0,
    variations: [ { value: 'Rouge', price: 20, id: 9000090, img: ASWEK_IMG + 'peinture-acrylique-rouge.png' } ]
  }),
  P({
    id: 900010, slug: 'aswek-colorant-pour-resine-epoxy',
    name: 'Colorant Pour Résine époxy', cat: ['aswek', 'les-resines', 'colorant-resine'],
    img: ASWEK_IMG + 'colorant-pour-resine-epoxy.png', cur: 'TND',
    priceFrom: 5, priceTo: 6, rating: 0,
    variations: [ { value: 'Standard', price: 5, id: 9000100, img: ASWEK_IMG + 'colorant-pour-resine-epoxy.png' } ]
  }),

  /* --- Collection : Piscine --- */
  P({
    id: 900011, slug: 'aswek-floculant-liquide-5l',
    name: 'Floculant Liquide (5L) : Clarifiant Haute Performance', cat: ['aswek', 'piscine', 'traitement-piscine'],
    img: ASWEK_IMG + 'floculant-liquide-5l.png', cur: 'TND',
    priceFrom: 35, priceTo: 35, rating: 0,
    variations: [ { value: '5 L', price: 35, id: 9000110, img: ASWEK_IMG + 'floculant-liquide-5l.png' } ]
  }),
  P({
    id: 900012, slug: 'aswek-aquacid-5l',
    name: 'AQUACID (5L) : Barrière Active Anti-algues', cat: ['aswek', 'piscine', 'traitement-piscine'],
    img: ASWEK_IMG + 'aquacid-5l.png', cur: 'TND',
    priceFrom: 40, priceTo: 60, rating: 0,
    variations: [ { value: '5 L', price: 40, id: 9000120, img: ASWEK_IMG + 'aquacid-5l.png' } ]
  }),
  P({
    id: 900013, slug: 'aswek-poly-piscine',
    name: 'Poly Piscine', cat: ['aswek', 'piscine', 'traitement-piscine'],
    img: ASWEK_IMG + 'poly-piscine.png', cur: 'TND',
    priceFrom: 30, priceTo: 33.50, rating: 0,
    variations: [ { value: 'Standard', price: 30, id: 9000130, img: ASWEK_IMG + 'poly-piscine.png' } ]
  }),
  P({
    id: 900014, slug: 'aswek-ph-moins-water-clean',
    name: 'pH Moins - Water clean', cat: ['aswek', 'piscine', 'traitement-piscine'],
    img: ASWEK_IMG + 'ph-moins-water-clean.png', cur: 'TND',
    priceFrom: 35, priceTo: 37, rating: 0,
    variations: [ { value: 'Standard', price: 35, id: 9000140, img: ASWEK_IMG + 'ph-moins-water-clean.png' } ]
  }),
  P({
    id: 900015, slug: 'aswek-ph-plus-water-clean',
    name: 'pH Plus - Water clean', cat: ['aswek', 'piscine', 'traitement-piscine'],
    img: ASWEK_IMG + 'ph-plus-water-clean.png', cur: 'TND',
    priceFrom: 24, priceTo: 24, rating: 0,
    variations: [ { value: 'Standard', price: 24, id: 9000150, img: ASWEK_IMG + 'ph-plus-water-clean.png' } ]
  }),
  P({
    id: 900016, slug: 'aswek-chlore-choc-5-kg',
    name: 'Chlore Choc (5 kg) : Désinfection Haute Performance', cat: ['aswek', 'piscine', 'traitement-piscine'],
    img: ASWEK_IMG + 'chlore-choc-5kg.png', cur: 'TND',
    priceFrom: 60, priceTo: 60, rating: 0,
    variations: [ { value: '5 kg', price: 60, id: 9000160, img: ASWEK_IMG + 'chlore-choc-5kg.png' } ]
  }),
  P({
    id: 900017, slug: 'aswek-chlore-multifonction-5kg',
    name: 'Chlore Multifonction (5kg)', cat: ['aswek', 'piscine', 'traitement-piscine'],
    img: ASWEK_IMG + 'chlore-multifonction-5kg.png', cur: 'TND',
    priceFrom: 50, priceTo: 66, rating: 0,
    variations: [ { value: '5 kg', price: 50, id: 9000170, img: ASWEK_IMG + 'chlore-multifonction-5kg.png' } ]
  }),

  /* --- Collection : POUDRE --- */
  P({
    id: 900018, slug: 'aswek-poudre-metallique-nacre',
    name: 'Poudre Métallique nacré', cat: ['aswek', 'colorants-et-pigments', 'poudre'],
    img: ASWEK_IMG + 'poudre-metallique-nacre.jpg', cur: 'TND',
    priceFrom: 5, priceTo: 9000, rating: 0,
    gallery: [
      ASWEK_IMG + 'poudre-metallique-nacre.jpg', ASWEK_IMG + 'poudre-metallique-nacre-2.jpg',
      ASWEK_IMG + 'poudre-metallique-nacre-3.jpg'
    ],
    variations: [
      { value: '25 gr', price: 5, id: 9000180, img: ASWEK_IMG + 'poudre-metallique-nacre.jpg' },
      { value: '50 gr', price: 5, id: 9000181, img: ASWEK_IMG + 'poudre-metallique-nacre.jpg' },
      { value: '100 gr', price: 9000, id: 9000182, img: ASWEK_IMG + 'poudre-metallique-nacre.jpg' }
    ]
  }),
  P({
    id: 900019, slug: 'aswek-feuille-dor-100-pieces',
    name: "Feuille D'or 100 Pièces", cat: ['aswek', 'colorants-et-pigments', 'pigments-decorations'],
    img: ASWEK_IMG + 'feuille-dor-100-pieces.jpg', cur: 'TND',
    priceFrom: 15, priceTo: 25, rating: 0,
    variations: [ { value: '100 pièces', price: 15, id: 9000190, img: ASWEK_IMG + 'feuille-dor-100-pieces.jpg' } ]
  }),
  P({
    id: 900020, slug: 'aswek-cire-de-soja',
    name: 'Cire de Soja', cat: ['aswek', 'bougies-et-cires', 'cires'],
    img: ASWEK_IMG + 'cire-de-soja.jpg', cur: 'TND',
    priceFrom: 26, priceTo: 29, rating: 0,
    variations: [ { value: 'Standard', price: 26, id: 9000200, img: ASWEK_IMG + 'cire-de-soja.jpg' } ]
  }),
  P({
    id: 900021, slug: 'aswek-cire-de-paraffine',
    name: 'Cire de Paraffine', cat: ['aswek', 'bougies-et-cires', 'cires'],
    img: ASWEK_IMG + 'cire-de-paraffine.jpg', cur: 'TND',
    priceFrom: 25, priceTo: 28, rating: 0,
    variations: [ { value: 'Standard', price: 25, id: 9000210, img: ASWEK_IMG + 'cire-de-paraffine.jpg' } ]
  }),
  P({
    id: 900022, slug: 'aswek-quartz-colore',
    name: 'Quartz coloré', cat: ['aswek', 'colorants-et-pigments', 'pigments-decorations'],
    img: ASWEK_IMG + 'quartz-colore.jpg', cur: 'TND',
    priceFrom: 2000, priceTo: 3500, rating: 0,
    variations: [ { value: 'Standard', price: 2000, id: 9000220, img: ASWEK_IMG + 'quartz-colore.jpg' } ]
  }),
  P({
    id: 900023, slug: 'aswek-huile-de-paraffine',
    name: 'Huile de Paraffine', cat: ['aswek', 'colorants-et-pigments', 'pigments-decorations'],
    img: ASWEK_IMG + 'huile-de-paraffine.png', cur: 'TND',
    priceFrom: 9, priceTo: 47, rating: 0,
    variations: [ { value: 'Standard', price: 9, id: 9000230, img: ASWEK_IMG + 'huile-de-paraffine.png' } ]
  }),
  P({
    id: 900024, slug: 'aswek-poudre-metallique-50-gr',
    name: 'Poudre Métallique 50 gr', cat: ['aswek', 'colorants-et-pigments', 'poudre'],
    img: ASWEK_IMG + 'poudre-metallique-50gr.png', cur: 'TND',
    priceFrom: 10, priceTo: 11, rating: 0,
    variations: [ { value: '50 gr', price: 10, id: 9000240, img: ASWEK_IMG + 'poudre-metallique-50gr.png' } ]
  }),
  P({
    id: 900025, slug: 'aswek-poudre-metallique-rouge-50-gr',
    name: 'Poudre Métallique Rouge', cat: ['aswek', 'colorants-et-pigments', 'poudre'],
    img: ASWEK_IMG + 'poudre-metallique-rouge.png', cur: 'TND',
    priceFrom: 10, priceTo: 11, rating: 0,
    variations: [ { value: '50 gr', price: 10, id: 9000250, img: ASWEK_IMG + 'poudre-metallique-rouge.png' } ]
  }),
  P({
    id: 900026, slug: 'aswek-poudre-metallique-blanc-base-50-gr',
    name: 'Poudre Métallique Blanc ( base )', cat: ['aswek', 'colorants-et-pigments', 'poudre'],
    img: ASWEK_IMG + 'poudre-metallique-blanc.png', cur: 'TND',
    priceFrom: 10, priceTo: 11, rating: 0,
    variations: [ { value: '50 gr', price: 10, id: 9000260, img: ASWEK_IMG + 'poudre-metallique-blanc.png' } ]
  }),
  P({
    id: 900027, slug: 'aswek-poudre-metallique-gold-50-gr',
    name: 'Poudre Métallique Gold', cat: ['aswek', 'colorants-et-pigments', 'poudre'],
    img: ASWEK_IMG + 'poudre-metallique-gold.png', cur: 'TND',
    priceFrom: 10, priceTo: 11, rating: 0,
    variations: [ { value: '50 gr', price: 10, id: 9000270, img: ASWEK_IMG + 'poudre-metallique-gold.png' } ]
  }),
  P({
    id: 900028, slug: 'aswek-poudre-metallique-bronze-50-gr',
    name: 'Poudre Métallique Bronze', cat: ['aswek', 'colorants-et-pigments', 'poudre'],
    img: ASWEK_IMG + 'poudre-metallique-bronze.png', cur: 'TND',
    priceFrom: 10, priceTo: 11, rating: 0,
    variations: [ { value: '50 gr', price: 10, id: 9000280, img: ASWEK_IMG + 'poudre-metallique-bronze.png' } ]
  }),
  P({
    id: 900029, slug: 'aswek-poudre-metallique-argent-50-gr',
    name: 'Poudre Métallique Argent', cat: ['aswek', 'colorants-et-pigments', 'poudre'],
    img: ASWEK_IMG + 'poudre-metallique-argent.png', cur: 'TND',
    priceFrom: 10, priceTo: 11, rating: 0,
    variations: [ { value: '50 gr', price: 10, id: 9000290, img: ASWEK_IMG + 'poudre-metallique-argent.png' } ]
  }),
  P({
    id: 900030, slug: 'aswek-pigment-phosphorescent',
    name: 'Pigment Phosphorescent', cat: ['aswek', 'colorants-et-pigments', 'pigments-decorations'],
    img: ASWEK_IMG + 'pigment-phosphorescent.png', cur: 'TND',
    priceFrom: 65, priceTo: 70, rating: 0,
    variations: [ { value: 'Standard', price: 65, id: 9000300, img: ASWEK_IMG + 'pigment-phosphorescent.png' } ]
  }),
  P({
    id: 900031, slug: 'aswek-silice-colore-gris',
    name: 'Silice coloré', cat: ['aswek', 'colorants-et-pigments', 'pigments-decorations'],
    img: ASWEK_IMG + 'silice-colore-gris.png', cur: 'TND',
    priceFrom: 2, priceTo: 6.90, rating: 0,
    variations: [ { value: 'Standard', price: 2, id: 9000310, img: ASWEK_IMG + 'silice-colore-gris.png' } ]
  }),
  P({
    id: 900032, slug: 'aswek-silice-colore-bleu',
    name: 'Silice coloré ( bleu )', cat: ['aswek', 'colorants-et-pigments', 'pigments-decorations'],
    img: ASWEK_IMG + 'silice-colore-bleu.png', cur: 'TND',
    priceFrom: 2, priceTo: 6.50, rating: 0,
    variations: [ { value: 'Bleu', price: 2, id: 9000320, img: ASWEK_IMG + 'silice-colore-bleu.png' } ]
  }),
  P({
    id: 900033, slug: 'aswek-silice-4mm',
    name: 'Silice 4 mm', cat: ['aswek', 'colorants-et-pigments', 'pigments-decorations'],
    img: ASWEK_IMG + 'silice-4mm.png', cur: 'TND',
    priceFrom: 1, priceTo: 12, rating: 0,
    variations: [ { value: '4 mm', price: 1, id: 9000330, img: ASWEK_IMG + 'silice-4mm.png' } ]
  }),
  P({
    id: 900034, slug: 'aswek-glitter-dore',
    name: 'Glitter doré', cat: ['aswek', 'colorants-et-pigments', 'pigments-decorations'],
    img: ASWEK_IMG + 'glitter-dore.png', cur: 'TND',
    priceFrom: 5, priceTo: 5500, rating: 0,
    variations: [ { value: 'Standard', price: 5, id: 9000340, img: ASWEK_IMG + 'glitter-dore.png' } ]
  }),

  /* --- Collection : DILUANT --- */
  P({
    id: 900035, slug: 'aswek-decoto-p500',
    name: 'DECOTOP 500', cat: ['aswek', 'diluants-et-vernis', 'vernis-techniques'],
    img: ASWEK_IMG + 'decotop-500.jpg', cur: 'TND',
    priceFrom: 60, priceTo: 62, rating: 0,
    variations: [ { value: 'Standard', price: 60, id: 9000350, img: ASWEK_IMG + 'decotop-500.jpg' } ]
  }),
  P({
    id: 900036, slug: 'aswek-decoto-p450',
    name: 'DECOTOP 450', cat: ['aswek', 'diluants-et-vernis', 'vernis-techniques'],
    img: ASWEK_IMG + 'decotop-450.jpg', cur: 'TND',
    priceFrom: 50, priceTo: 65, rating: 0,
    variations: [ { value: 'Standard', price: 50, id: 9000360, img: ASWEK_IMG + 'decotop-450.jpg' } ]
  }),
  P({
    id: 900037, slug: 'aswek-vernis-var-23',
    name: 'Vernis VAR 23', cat: ['aswek', 'diluants-et-vernis', 'vernis-techniques'],
    img: ASWEK_IMG + 'vernis-var-23.jpg', cur: 'TND',
    priceFrom: 18, priceTo: 19, rating: 0,
    variations: [ { value: 'Standard', price: 18, id: 9000370, img: ASWEK_IMG + 'vernis-var-23.jpg' } ]
  }),
  P({
    id: 900038, slug: 'aswek-vernis-var-27',
    name: 'Vernis VAR 27', cat: ['aswek', 'diluants-et-vernis', 'vernis-techniques'],
    img: ASWEK_IMG + 'vernis-var-27.jpg', cur: 'TND',
    priceFrom: 22, priceTo: 29, rating: 0,
    variations: [ { value: 'Standard', price: 22, id: 9000380, img: ASWEK_IMG + 'vernis-var-27.jpg' } ]
  }),
  P({
    id: 900039, slug: 'aswek-diluant-4l',
    name: 'Diluant 4 L', cat: ['aswek', 'diluants-et-vernis', 'diluants'],
    img: ASWEK_IMG + 'diluant-4l.png', cur: 'TND',
    priceFrom: 20, priceTo: 24, rating: 0,
    variations: [ { value: '4 L', price: 20, id: 9000390, img: ASWEK_IMG + 'diluant-4l.png' } ]
  }),
  P({
    id: 900040, slug: 'aswek-diluant-0-7l',
    name: 'Diluant 0.7 L', cat: ['aswek', 'diluants-et-vernis', 'diluants'],
    img: ASWEK_IMG + 'diluant-0-7l.png', cur: 'TND',
    priceFrom: 4, priceTo: 4.80, rating: 0,
    variations: [ { value: '0.7 L', price: 4, id: 9000400, img: ASWEK_IMG + 'diluant-0-7l.png' } ]
  }),
  P({
    id: 900041, slug: 'aswek-diluant-0-4l',
    name: 'DILUANT 0.4 L', cat: ['aswek', 'diluants-et-vernis', 'diluants'],
    img: ASWEK_IMG + 'diluant-0-4l.png', cur: 'TND',
    priceFrom: 2650, priceTo: 2900, rating: 0,
    variations: [ { value: '0.4 L', price: 2650, id: 9000410, img: ASWEK_IMG + 'diluant-0-4l.png' } ]
  }),
  P({
    id: 900042, slug: 'aswek-diluant-0-125l',
    name: 'Diluant 0.125 L', cat: ['aswek', 'diluants-et-vernis', 'diluants'],
    img: ASWEK_IMG + 'diluant-0-125l.png', cur: 'TND',
    priceFrom: 1.25, priceTo: 1.60, rating: 0,
    variations: [ { value: '0.125 L', price: 1.25, id: 9000420, img: ASWEK_IMG + 'diluant-0-125l.png' } ]
  }),

  /* --- Divers --- */
  P({
    id: 900043, slug: 'aswek-soude',
    name: 'SOUDE', cat: ['aswek', 'diluants-et-vernis', 'entretien-nettoyage'],
    img: ASWEK_IMG + 'soude.png', cur: 'TND',
    priceFrom: 4.50, priceTo: 5.90, rating: 0,
    gallery: [
      ASWEK_IMG + 'soude.png', ASWEK_IMG + 'soude-2.png',
      ASWEK_IMG + 'soude-3.png', ASWEK_IMG + 'soude-4.png'
    ],
    variations: [ { value: 'Standard', price: 4.50, id: 9000430, img: ASWEK_IMG + 'soude.png' } ]
  }),
  P({
    id: 900044, slug: 'aswek-deep-etanche-pro',
    name: 'DEEP ETANCHE PRO', cat: ['aswek', 'etancheite', 'etancheite-toitures'],
    img: ASWEK_IMG + 'deep-etanche-pro.jpg', cur: 'TND',
    priceFrom: 150, priceTo: 156, rating: 0,
    short: "Peinture d'étanchéité souple et élastique, destinée à étanchéifier les terrasses, toitures, balcons...",
    features: [
      { label: 'Liant', value: 'Acrylique pure' },
      { label: 'Diluant', value: 'Eau' },
      { label: 'Couleur', value: 'Blanc, transparent' },
      { label: 'Rendement', value: '1 Kg / 2-3 m²' },
      { label: 'Séchage au touché', value: '1 - 1.5 heure' },
      { label: 'Intervalle repeindre', value: '~3 heures' }
    ],
    variations: [ { value: 'Standard', price: 150, id: 9000440, img: ASWEK_IMG + 'deep-etanche-pro.jpg' } ]
  })
);

/* Named product sets used on the homepage */
const HOMEPAGE_SECTIONS = [
  { marquee: true, title: 'Nos best-sellers', link: 'shop.html?orderby=popularity', linkText: 'Découvrez toutes les offres',
    ids: [900001, 900043, 900040, 900038, 900044, 900036, 900022, 900021, 900020, 900006, 900018, 900002] },
  { marquee: true, title: 'Nos Résines', link: 'category.html?c=les-resines', linkText: 'Découvrez toutes les offres',
    ids: [900001, 900002, 900005, 900006, 900007, 900008, 900009, 900010] },
  { title: 'Moules et Silicones', link: 'category.html?c=moules-silicones', linkText: 'Découvrez toutes les offres',
    ids: [900003, 900004] },
  { marquee: true, title: 'Colorants et Pigments', link: 'category.html?c=colorants-et-pigments', linkText: 'Découvrez toutes les offres',
    ids: [900018, 900024, 900025, 900026, 900027, 900028, 900029, 900022, 900030, 900034] },
  { title: 'Nos catégories', link: 'shop.html', linkText: 'Toutes les catégories',
    categories: [
      { name: 'RÉSINES', img: ASWEK_IMG + 'resine-epoxy-3d.png', url: 'category.html?c=les-resines' },
      { name: 'SILICONES ET MOULES', img: ASWEK_IMG + 'silicone-pour-moule-5kg.png', url: 'category.html?c=moules-silicones' },
      { name: 'COLORANTS ET PIGMENTS', img: ASWEK_IMG + 'poudre-metallique-nacre.jpg', url: 'category.html?c=colorants-et-pigments' },
      { name: 'DILUANTS ET VERNIS', img: ASWEK_IMG + 'diluant-4l.png', url: 'category.html?c=diluants-et-vernis' },
      { name: 'BOUGIES ET CIRES', img: ASWEK_IMG + 'cire-de-soja.jpg', url: 'category.html?c=bougies-et-cires' },
      { name: 'ÉTANCHÉITÉ', img: ASWEK_IMG + 'deep-etanche-pro.jpg', url: 'category.html?c=etancheite' },
      { name: 'PISCINE', img: ASWEK_IMG + 'poly-piscine.png', url: 'category.html?c=piscine' }
    ] }
];

const HERO_SLIDES = [
  { img: 'images/00.webp',
    mobile: 'images/00-mobile.webp',
    link: 'product.html?p=aswek-resine-epoxy-3d' }
];

const SERVICE_BADGES = [
  { title: 'Commandez en 3 clics', text: 'Un parcours simple et rapide' },
  { title: 'Expédition en 24/48h', text: 'Vos produits expédiés rapidement' },
  { title: 'Assistance technique professionnelle', text: 'Une équipe experte à votre écoute' },
  { title: '200 000 créatifs sur les réseaux sociaux', text: 'Une communauté active' },
  { title: 'Pour les débutants et les experts', text: 'Des produits pour tous niveaux' },
  { title: 'Qualité 100% Made in Italy', text: 'Des standards de production élevés' },
  { title: 'Large gamme de produits', text: 'Plus de 2000 références' }
];

const STATS = [
  { value: '4.8', label: 'Avis moyens' },
  { value: '2000+', label: 'Produits' },
  { value: '1M+', label: 'Clients satisfaits' },
  { value: 'Support technique', label: 'Nos services' }
];

const BLOG_CATEGORIES = ['bijoux et créations', 'Effet de couleurs', 'Grandes coulées et bois', 'Inclusions',
  'Interviews originales et idées', 'Nautique', 'Nouveaux produits', 'Peintures , plateaux et revêtements',
  'Polissage et entretien', 'Protection et sécurité', 'Silicones et moules', 'Sols', 'Trucs et astuces'];

const HELP_LINKS = ["Vidéos d'aide", "Articles d'aide", 'Calculateur de résine', 'FAQ', 'Documents (FDS & TDS)'];

const FOOTER_LINKS = [
  { title: 'AIDE ET VIDÉOS', items: HELP_LINKS },
  { title: 'SERVICE CLIENT', items: ['Qui sommes-nous', 'Contacts', 'Livraison et retours', 'Termes et conditions', 'Détaillants / Gros consommateurs'] },
  { title: 'INFORMATIONS', items: ['Frais de Livraison et de Transport', 'Favoris', 'Guides projet', 'Blog'] }
];

const CURRENCIES = { EUR: '€', TND: 'د.ت' };
function curSymbol(cur) { return CURRENCIES[cur] || CURRENCIES.EUR; }
function money(v, cur) {
  const sym = curSymbol(cur);
  const n = v.toFixed(2).replace('.', ',');
  return cur === 'TND' ? n + ' ' + sym : n + ' ' + sym;
}
function moneyLong(v, cur) {
  const sym = curSymbol(cur);
  const s = v.toFixed(2).replace('.', ',');
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ' + sym;
}
function findProduct(slug) {
  return PRODUCTS.find(p => p.slug === slug) || PRODUCTS[0];
}
function productsBySection(section) {
  if (section.ids) return section.ids.map(id => PRODUCTS.find(p => p.slug && p.id === id) || PRODUCTS.filter(p => p.id === id)[0]).filter(Boolean);
  return [];
}
function productsInCategory(cat) {
  return PRODUCTS.filter(p => p.cat.includes(cat));
}
