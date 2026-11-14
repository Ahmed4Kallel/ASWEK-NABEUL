#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const https=require('https');
const ROOT=path.resolve(__dirname,'..');
const OUT_DIR=path.join(ROOT,'data','ai');
const API_KEY=process.env.GEMINI_API_KEY;
const MODELS=['gemini-flash-lite-latest','gemini-3.7-flash','gemini-3.8-flash','gemini-flash-latest'];

function loadProducts(){
  const code=fs.readFileSync(path.join(ROOT,'js','data.js'),'utf8')+'\n;__OUT__={PRODUCTS,CATEGORIES};\n';
  const sb={console};vm.createContext(sb);vm.runInContext(code,sb);return sb.__OUT__;
}
function httpJson(url,payload){
  return new Promise((resolve,reject)=>{
    const body=Buffer.from(JSON.stringify(payload),'utf8');
    const u=new URL(url);
    const req=https.request({hostname:u.hostname,path:u.pathname+u.search,method:'POST',headers:{'Content-Type':'application/json','Content-Length':body.length}},res=>{
      let d='';res.on('data',c=>d+=c);res.on('end',()=>{let json=null;try{json=JSON.parse(d);}catch(e){}resolve({status:res.statusCode,json,raw:d});});
    });
    req.on('error',reject);req.setTimeout(120000,()=>req.destroy(new Error('timeout')));req.write(body);req.end();
  });
}
async function callAI(prompt){
  let last='';
  for(const m of MODELS){
    for(let attempt=0;attempt<2;attempt++){
      try{
        const {status,json}=await httpJson(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${API_KEY}`,{
          contents:[{parts:[{text:prompt}]}],
          generationConfig:{temperature:0.5,maxOutputTokens:8192,responseMimeType:'application/json'}
        });
        if(status===200)return json.candidates?.[0]?.content?.parts?.map(p=>p.text).join('')||'';
        last='http'+status;
      }catch(e){last=e.message;}
    }
  }
  throw new Error('AI failed: '+last);
}
function parseLoose(text){
  let s=String(text).trim().replace(/^\uFEFF/,'').replace(/^```json/i,'').replace(/^```/,'').replace(/```$/,'').trim();
  try{return JSON.parse(s);}catch(e){}
  const starts=[s.indexOf('{'),s.indexOf('[')].filter(i=>i>=0).sort((a,b)=>a-b);
  if(starts.length){
    const sub=s.slice(starts[0]);
    try{return JSON.parse(sub);}catch(e){}
    const ends=[sub.lastIndexOf('}'),sub.lastIndexOf(']')].filter(i=>i>=0).sort((a,b)=>b-a);
    for(const e of ends){
      let cand=sub.slice(0,e+1);
      try{return JSON.parse(cand);}catch(err){}
      const trimmed=cand.replace(/,\s*$/,'');
      try{return JSON.parse(trimmed);}catch(err){}
    }
    for(let end=sub.length;end>0;end--){
      const c=sub.slice(0,end).replace(/,\s*$/,'');
      try{return JSON.parse(c);}catch(err){}
    }
  }
  throw new Error('JSON parse failed');
}
function save(n,d){fs.writeFileSync(path.join(OUT_DIR,n+'.json'),JSON.stringify(d,null,2),'utf8');console.log('  saved',n+'.json');}
const list=ps=>JSON.stringify(ps.map(p=>({slug:p.slug,name:p.name,cat:p.cat})));

async function run(name,fn){try{await fn();}catch(e){console.log('  FAILED',name,'-',e.message);}}

async function main(){
  if(!API_KEY){console.error('GEMINI_API_KEY manquant');process.exit(1);}
  fs.mkdirSync(OUT_DIR,{recursive:true});
  const {PRODUCTS,CATEGORIES}=loadProducts();
  const L=list(PRODUCTS);
  console.log('Produits:',PRODUCTS.length);

  await run('smart-search',async()=>{
    console.log('[smart-search]');
    const txt=await callAI(`Tu es un moteur de recherche pour la boutique ASWEK (Tunisie, résines époxy, silicones, pigments, piscine, étanchéité, bougies).
Produits: ${L}
Pour CHAQUE produit, génère: "slug", "synonyms" (5 à 8 mots-clés français concrets liés aux usages/matériaux/projets), "intents" (3 à 5 formulations de recherche utilisateur, ex: "résine pour bijoux", "comment faire un plateau").
Réponds par un tableau JSON strict: [{"slug":"...","synonyms":["..."],"intents":["..."]}]`);
    save('smart-search',{generated_at:new Date().toISOString(),items:parseLoose(txt)});
  });

  await run('resin-calculator-ai',async()=>{
    console.log('[resin-calculator-ai]');
    const resins=PRODUCTS.filter(p=>String(p.cat).toLowerCase().includes('resine')||String(p.cat).toLowerCase().includes('résine'));
    const txt=await callAI(`Crée la configuration d'un calculateur de résine pour ASWEK (boutique Tunisie). Sois factuel et prudent, ne fournis aucune donnée commerciale inventée.
Produits résine: ${JSON.stringify(resins.map(p=>({slug:p.slug,name:p.name})))}
Renvoie un objet JSON:
{
 "shapes":[{"id":"rectangle","label":"Rectangle","fields":["longueur_cm","largeur_cm","hauteur_cm"]},{"id":"cercle","label":"Cercle","fields":["diametre_cm","hauteur_cm"]},{"id":"irregulier","label":"Forme irrégulière","fields":["poids_eau_g"]}],
 "formulas":{"rectangle":"longueur × largeur × hauteur × densité","cercle":"π × (diamètre/2)² × hauteur × densité","irregulier":"poids_eau_g ÷ densité_eau × densité_resine"},
 "densities":{"epoxy":1.1,"silicone":1.2,"unite":"g/cm3"},
 "waste_factor":1.1,
 "advice":[{"max_cm":1,"text":"..."}],
 "product_match":[{"if":"bijoux","slugs":["..."]}],
 "safety_notes":["..."]
}`);
    const j=parseLoose(txt);
    save('resin-calculator-ai',{generated_at:new Date().toISOString(),...(Array.isArray(j)?{rules:j}:j)});
  });

  await run('recommendations',async()=>{
    console.log('[recommendations]');
    const txt=await callAI(`Système de recommandations produits pour ASWEK (Tunisie).
Produits: ${L}
Renvoie un objet JSON:
{
 "by_project":{"plateau-riviere":["slug"],"bijoux":["slug"],"moule-silicone":["slug"],"bougie":["slug"],"piscine":["slug"],"etancheite":["slug"]},
 "also_bought":{"slug":["slug","slug","slug"]},
 "by_category":{"<categorie>":["slug"]}
}
Utilise UNIQUEMENT des slugs existants. 3 recommandations maximum par entrée.`);
    const j=parseLoose(txt);
    save('recommendations',{generated_at:new Date().toISOString(),...(Array.isArray(j)?{items:j}:j)});
  });

  await run('project-guides',async()=>{
    console.log('[project-guides]');
    const txt=await callAI(`Génère 6 guides projet pas-à-pas en français pour la boutique ASWEK (Tunisie).
Produits disponibles: ${L}
Guides: plateau-riviere, bijoux-resine, moule-silicone, bougie-parfumee, traitement-piscine, etancheite-toiture.
Renvoie un tableau JSON: [{"slug":"...","title":"...","difficulty":"Débutant|Intermédiaire|Avancé","time":"...","intro":"2 phrases","materials":[{"name":"...","slug":"slug ou null"}],"tools":["..."],"steps":[{"n":1,"title":"...","desc":"...","tip":"..."}],"safety":["..."],"tips":["..."]}]
Utilise uniquement les slugs produits existants; n'invente aucun dosage technique (écris "voir la fiche technique").`);
    save('project-guides',{generated_at:new Date().toISOString(),guides:parseLoose(txt)});
  });

  await run('i18n',async()=>{
    console.log('[i18n]');
    const txt=await callAI(`Crée les traductions FR/AR/EN d'une interface de boutique vitrine nommée ASWEK.
Renvoie un objet JSON {"fr":{...},"ar":{...},"en":{...}} avec EXACTEMENT ces clés:
nav_home, nav_shop, nav_favorites, nav_guides, search_placeholder, search_button, favorites_title, favorites_empty,
product_add_fav, product_remove_fav, product_definition, product_tabs_description, product_tabs_usage, product_tabs_safety,
product_related, product_share, product_reviews, product_ai_badge, guides_title, guides_intro, guides_materials, guides_steps, guides_safety, guides_difficulty, guides_time,
chatbot_title, chatbot_subtitle, chatbot_placeholder, chatbot_send, chatbot_welcome,
calculator_title, calculator_intro, calculator_length, calculator_width, calculator_height, calculator_diameter, calculator_weight, calculator_result, calculator_note,
shipping_free, footer_rights
Arabe standard correct, anglais naturel.`);
    save('i18n',{generated_at:new Date().toISOString(),...parseLoose(txt)});
  });

  await run('review-summaries',async()=>{
    console.log('[review-summaries]');
    const txt=await callAI(`Génère des synthèses d'avis clients PLAUSIBLES et PRUDENTES pour chaque produit ASWEK.
Produits: ${L}
Ne prétends jamais à des avis réels vérifiés; ces textes sont indicatifs.
Renvoie un objet JSON {"<slug>":{"summary":"2-3 phrases","pros":["..."],"cons":["..."],"rating":4.5,"count":12,"highlights":["..."]}}.
Notes entre 3.8 et 4.9, avis entre 8 et 40.`);
    save('review-summaries',{generated_at:new Date().toISOString(),items:parseLoose(txt)});
  });

  await run('seo-alt',async()=>{
    console.log('[seo-alt]');
    const txt=await callAI(`Génère les métadonnées SEO et textes alternatifs d'images pour chaque produit ASWEK (Tunisie).
Produits: ${JSON.stringify(PRODUCTS.map(p=>({slug:p.slug,name:p.name,cat:p.cat,img:p.img})))}
Renvoie un objet JSON {"<slug>":{"seo_title":"max 60 car.","seo_desc":"max 155 car.","h1":"...","alt_main":"...","keywords":["..."]}}.
Français, mention "Tunisie" quand pertinent, aucune promesse inventée.`);
    save('seo-alt',{generated_at:new Date().toISOString(),items:parseLoose(txt)});
  });

  console.log('DONE');
}
main().catch(e=>{console.error(e);process.exit(1);});
