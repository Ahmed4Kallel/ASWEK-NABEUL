#!/usr/bin/env node
'use strict';
/*
 * Compile data/admin/overrides.json vers data/ai/overrides-applied.json.
 * Le site public lit UNIQUEMENT data/ai/overrides-applied.json (jamais les
 * fichiers IA de base) : les surcharges sont donc reversibles et auditables.
 *
 *   node scripts/apply-overrides.js            # compile + rapport
 *   node scripts/apply-overrides.js --dry-run  # rapport sans ecrire
 */
const path = require('path');
const lib = require('./overrides-lib.js');

const ROOT = path.resolve(__dirname, '..');
const DRY = process.argv.includes('--dry-run');

const res = lib.compile(ROOT, { dryRun: DRY });
if (!res.out) {
  console.error('Erreur :', res.warnings.join(' / '));
  process.exit(1);
}
console.log((DRY ? '[dry-run] ' : '') + 'overrides compilees :', JSON.stringify(res.counts));
console.log('fichier :', DRY ? '(non ecrit) data/ai/overrides-applied.json' : 'data/ai/overrides-applied.json');
if (res.warnings.length) {
  console.log('\nAvertissements :');
  res.warnings.forEach(w => console.log(' - ' + w));
}
