const fs=require('node:fs');
const path=require('node:path');
const {execSync}=require('node:child_process');
let ts;try{ts=require('typescript')}catch{const globalRoot=execSync('npm root -g',{encoding:'utf8'}).trim();ts=require(path.join(globalRoot,'typescript'))}

const frontendRoots=['apps/admin/app','apps/storefront/app','apps/storefront/components','apps/storefront/themes','apps/superadmin/app','apps/developer/app'];
const excludes=new Set(['node_modules','.next','locales','dist','build','public','theme-sources','.patch-backups']);
const turkish=/[çğıöşüÇĞİÖŞÜ]/;
const attrNames=new Set(['label','title','placeholder','description','subtitle','buttonLabel','aria-label','alt']);
const callNames=new Set(['setMsg','setErr','setError','confirm','alert']);
const localizedFns=new Set(['adminText','sfText','uiText','saText','t']);
const results=[];
function lineOf(sf,node){return sf.getLineAndCharacterOfPosition(node.getStart(sf)).line+1}
function localizedAncestor(node){let p=node.parent;for(let i=0;p&&i<6;i++,p=p.parent){if(ts.isCallExpression(p)&&ts.isIdentifier(p.expression)&&localizedFns.has(p.expression.text))return true}return false}
function add(sf,file,node,kind,value){const text=String(value||'').replace(/\s+/g,' ').trim();if(text&&turkish.test(text)&&!localizedAncestor(node))results.push({file,line:lineOf(sf,node),kind,text})}
function scan(file){const raw=fs.readFileSync(file,'utf8');const sf=ts.createSourceFile(file,raw,ts.ScriptTarget.Latest,true,file.endsWith('x')?ts.ScriptKind.TSX:ts.ScriptKind.TS);function visit(node){if(ts.isJsxText(node))add(sf,file,node,'jsx',node.getText(sf));if(ts.isJsxAttribute(node)&&attrNames.has(String(node.name.text))&&node.initializer&&ts.isStringLiteral(node.initializer))add(sf,file,node,'attr:'+node.name.text,node.initializer.text);if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&callNames.has(node.expression.text)&&node.arguments[0]){const a=node.arguments[0];if(ts.isStringLiteral(a)||ts.isNoSubstitutionTemplateLiteral(a))add(sf,file,a,'call:'+node.expression.text,a.text)}if(ts.isNewExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='Error'&&node.arguments?.[0]){const a=node.arguments[0];if(ts.isStringLiteral(a)||ts.isNoSubstitutionTemplateLiteral(a))add(sf,file,a,'new:Error',a.text)}if((ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node))&&node.parent&&ts.isConditionalExpression(node.parent)&&(node.parent.whenTrue===node||node.parent.whenFalse===node)&&node.parent.parent&&ts.isJsxExpression(node.parent.parent))add(sf,file,node,'jsx-condition',node.text);ts.forEachChild(node,visit)}visit(sf)}
function walk(root){if(!fs.existsSync(root))return;for(const entry of fs.readdirSync(root,{withFileTypes:true})){const p=path.join(root,entry.name);if(entry.isDirectory()){if(!excludes.has(entry.name))walk(p)}else if(/\.(tsx?|jsx?)$/.test(entry.name))scan(p)}}
frontendRoots.forEach(walk);
const byFile={};for(const row of results)byFile[row.file]=(byFile[row.file]||0)+1;
console.log(`Deep frontend user-facing Turkish candidates: ${results.length}`);
Object.entries(byFile).sort((a,b)=>b[1]-a[1]).forEach(([file,count])=>console.log(`${count}\t${file}`));
fs.mkdirSync('reports',{recursive:true});fs.writeFileSync('reports/i18n-deep-audit.json',JSON.stringify({generatedAt:new Date().toISOString(),count:results.length,byFile,results},null,2));
if(process.env.I18N_DEEP_STRICT==='1'&&results.length)process.exit(2);
