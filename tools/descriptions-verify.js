/* Vérification descriptions produits — processus reprenable.
   Usage : node tools/descriptions-verify.js
   Compare le catalogue (data.js) avec data/product-content.json et signale
   les produits sans description ou insuffisants. Exit 1 si problèmes. */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const dataSrc = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
const slugs = [...dataSrc.matchAll(/slug:\s*'([^']+)'/g)].map(m => m[1]);
const names = [...dataSrc.matchAll(/slug:\s*'([^']+)'[\s\S]*?name:\s*'([^']+)'/g)].map(m => ({ slug: m[1], name: m[2] }));

const contentPath = path.join(ROOT, 'data', 'product-content.json');
let content;
try { content = JSON.parse(fs.readFileSync(contentPath, 'utf8')); }
catch (e) { console.error('FATAL: product-content.json illisible :', e.message); process.exit(1); }

const products = content.products || {};
const report = { generated_at: new Date().toISOString(), total_products: slugs.length, total_content: Object.keys(products).length, missing: [], insufficient: [], duplicates: [] };

const seen = new Map();
names.forEach(n => {
  if (seen.has(n.slug)) report.duplicates.push(n.slug);
  seen.set(n.slug, n.name);
});

const MIN_DESC = 300;
for (const { slug, name } of names) {
  const c = products[slug];
  if (!c) { report.missing.push({ slug, name }); continue; }
  const dl = (c.description || '').length;
  const problems = [];
  if (dl < MIN_DESC) problems.push(`description trop courte (${dl} < ${MIN_DESC})`);
  if (!c.definition || !c.definition.length) problems.push('definition absente');
  if (!c.usage || !c.usage.length) problems.push('liste d utilisations absente');
  if (!c.safety) problems.push('securite absente');
  if (c.unavailable) problems.push('unavailable=true');
  if (problems.length) report.insufficient.push({ slug, name, problems });
}

report.ok = report.missing.length === 0 && report.insufficient.length === 0;
const outPath = path.join(ROOT, 'data', 'admin', 'descriptions-audit.json');
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(`Produits catalogue : ${report.total_products} | contenus : ${report.total_content}`);
console.log(`Manquants : ${report.missing.length} | Insuffisants : ${report.insufficient.length} | Doublons : ${report.duplicates.length}`);
if (report.missing.length) report.missing.forEach(x => console.log('  MISSING', x.slug, '-', x.name));
report.insufficient.forEach(x => console.log('  NEEDS WORK', x.slug, ':', x.problems.join(' ; ')));
console.log('Rapport :', path.relative(ROOT, outPath));
process.exit(report.ok ? 0 : 1);
