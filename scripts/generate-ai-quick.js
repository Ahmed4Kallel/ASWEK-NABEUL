#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const https=require('https');
const ROOT=path.resolve(__dirname,'..');
const OUT_DIR=path.join(ROOT,'data','ai');
const API_KEY=process.env.GEMINI_API_KEY;
const MODEL='gemini-flash-lite-latest';
const FALLBACK=['gemini-3.7-flash'];

function loadProducts(){
  let code=fs.readFileSync(path.join(ROOT,'js','data.js'),'utf8')+'\n;__OUT__={PRODUCTS,CATEGORIES};\n';
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
async function callAI(prompt,jsonMode){
  const models=[MODEL,...FALLBACK];
  for(const m of models){
    try{
      const url=`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${API_KEY}`;
      const payload={contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.6,maxOutputTokens:2048}};
      if(jsonMode)payload.generationConfig.responseMimeType='application/json';
      const {status,json}=await httpJson(url,payload);
      if(status!==200)throw new Error('http'+status);
      return json.candidates?.[0]?.content?.parts?.map(p=>p.text).join('')||'';
    }catch(e){}
  }
  throw new Error('failed');
}
function extractJson(t){
  let s=t.trim().replace(/^```json/i,'').replace(/^```/,'').replace(/```$/,'').trim();
  const i=s.indexOf('['),j=s.lastIndexOf(']'),i2=s.indexOf('{'),j2=s.lastIndexOf('}');
  if(i2>=0&&j2>i2&&(i<0||j2>j))return JSON.parse(s.slice(i2,j2+1));
  if(i>=0&&j>i)return JSON.parse(s.slice(i,j+1));
  return JSON.parse(s);
}
function save(n,d){fs.writeFileSync(path.join(OUT_DIR,n+'.json'),JSON.stringify(d,null,2),'utf8');}

async function main(){
  if(!API_KEY){console.error('no key');process.exit(1);}
  fs.mkdirSync(OUT_DIR,{recursive:true});
  const {PRODUCTS}=loadProducts();
  console.log('Produits:',PRODUCTS.length);
  
  try{
    console.log('[1/3] short-descriptions...');
    const p1=`Pour CHAQUE produit donne une accroche max 55 caractères factuelle FR. ${JSON.stringify(PRODUCTS.map(p=>({slug:p.slug,name:p.name,cat:p.cat})))}. JSON {"slug":"accroche"}`;
    save('short-descriptions',{generated_at:new Date().toISOString(),items:extractJson(await callAI(p1,true))});
    console.log('ok1');
  }catch(e){console.log('e1',e.message);}
  
  try{
    console.log('[2/3] chatbot-kb...');
    const p2=`Base KB ASWEK FR pour chatbot. Produits:${JSON.stringify(PRODUCTS.map(p=>({slug:p.slug,name:p.name,cat:p.cat})))}. Crée faqs[], product_guidance{}, shipping:{free:500,fee:8.9}, greetings[]. JSON objet`;
    save('chatbot-kb',{generated_at:new Date().toISOString(),...extractJson(await callAI(p2,true))});
    console.log('ok2');
  }catch(e){console.log('e2',e.message);}
  
  try{
    console.log('[3/3] smart-search...');
    const p3=`Index recherche intelligente ASWEK. ${JSON.stringify(PRODUCTS.map(p=>({slug:p.slug,name:p.name,cat:p.cat})))}. Pour chaque: slug,synonyms[],intents[]. JSON array`;
    save('smart-search',{generated_at:new Date().toISOString(),items:extractJson(await callAI(p3,true))});
    console.log('ok3');
  }catch(e){console.log('e3',e.message);}
  
  // duplicates local
  const dupes={generated_at:new Date().toISOString(),exact:[],near:[]};
  const by={};
  PRODUCTS.forEach(p=>{const k=p.name.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();if(!by[k])by[k]=[];by[k].push(p);});
  Object.values(by).forEach(g=>{if(g.length>1)dupes.exact.push({key:g[0].name,products:g.map(x=>({id:x.id,slug:x.slug,name:x.name}))});});
  PRODUCTS.forEach((a,i)=>PRODUCTS.slice(i+1).forEach(b=>{const na=a.name.toLowerCase(),nb=b.name.toLowerCase();if(na.includes(nb)||nb.includes(na))dupes.near.push({a:{id:a.id,slug:a.slug},b:{id:b.id,slug:b.slug}});}));
  dupes.near=dupes.near.slice(0,30);
  save('duplicates',dupes);
  console.log('duplicates ok');
  console.log('DONE');
}
main().catch(e=>{console.error(e);process.exit(1);});
