const fs=require("fs"),vm=require("vm"),assert=require("assert/strict"),path=require("path");
const ctx={};vm.createContext(ctx);
for(const f of ["dados.js","logica.js"])vm.runInContext(fs.readFileSync(path.join(__dirname,"..",f),"utf8").replace(/^const /gm,"var "),ctx);
const run=c=>{const v=vm.runInContext(c,ctx);return Array.isArray(v)&&typeof v[0]!=="object"?[...v]:v};
let n=0;const t=(name,fn)=>{fn();n++;console.log("ok -",name)};

t("plano sem dias bloqueados",()=>{
  const P=run("PLAN");
  for(const d of ["2026-11-11","2027-02-08","2027-02-10","2027-02-11"])assert.ok(!P.some(p=>p.d===d),d);
  assert.equal(P.length,run("PLAN_BASE").length-4);
  assert.ok(P.some(p=>p.d==="2027-01-04"),"início do período mantém-se");
});
t("nenhuma sessão no dia do teste da disciplina",()=>{
  assert.ok(!run("PLAN").some(p=>run(`isTestDayOf(${JSON.stringify(p.s)},"${p.d}")`)));
});
t("interrupções e feriados não são dias de estudo",()=>{
  for(const d of ["2026-12-16","2026-12-21","2027-01-03","2027-03-22","2027-04-01","2026-10-05","2026-12-09"])assert.equal(run(`isStudyDay("${d}")`),false,d);
  assert.equal(run(`isStudyDay("2026-09-28")`),true);
});
t("sessão falhada é proposta na sessão seguinte",()=>{
  run(`st=emptyState("2026-09-28")`);
  const p=run(`recoveryProposals(st,"2026-10-01")`);
  // 28/09 FQ e 30/09 Inglês falhadas; FQ (teste 07/10) fica com a 1.ª hora livre
  assert.equal(p.length,2);
  assert.equal(p[0].s,"Físico-Química");assert.equal(p[0].alvo,"2026-10-01");
  assert.equal(p[1].s,"Inglês");assert.equal(p[1].alvo,"2026-10-08"); // 07/10 já tem Inglês
});
t("não recupera no dia do teste nem depois",()=>{
  run(`st=emptyState("2026-10-01")`);
  // 01/10 Matemática falhada; seguinte: 07/10 (antes do teste de 13/10)
  let p=run(`recoveryProposals(st,"2026-10-02")`);
  assert.equal(p[0].alvo,"2026-10-07");
  // Inglês 07/10 falhado, teste a 09/10; próxima hora é 08/10 → ok
  run(`st=emptyState("2026-10-07")`);
  p=run(`recoveryProposals(st,"2026-10-09")`);
  const ing=p.find(x=>x.s==="Inglês");assert.equal(ing.alvo,null);assert.equal(ing.motivo,"teste");
});
t("não recupera numa hora que já tem a mesma disciplina",()=>{
  run(`st=emptyState("2026-09-23");addSession(st,{data:"2026-09-24",disciplina:"Matemática",minutos:45});addSession(st,{data:"2026-09-28",disciplina:"Físico-Química",minutos:45})`);
  // Só Inglês falhado a 23/09; a 30/09 já há Inglês no plano, por isso passa para 01/10
  const p=run(`recoveryProposals(st,"2026-09-30")`).find(x=>x.s==="Inglês"&&x.d==="2026-09-23");
  assert.equal(p.alvo,"2026-10-01");
});
t("aceitar e dispensar resolvem a proposta",()=>{
  run(`st=emptyState("2026-09-28")`);
  run(`for(const p of recoveryProposals(st,"2026-10-01")){p.s==="Inglês"?dismissMissed(st,p):acceptRecovery(st,p)}`);
  assert.equal(run(`recoveryProposals(st,"2026-10-01")`).length,0);
  assert.deepEqual(run(`planOn(st,"2026-10-01").map(p=>p.s+":"+p.tipo)`),["Matemática:plano","Físico-Química:recuperacao"]);
});
t("registo cria temas sem duplicados (acentos e maiúsculas)",()=>{
  run(`st=emptyState("2026-09-28");addSession(st,{data:"2026-09-28",disciplina:"Matemática",minutos:45,temas:["Função quadrática","funcao quadratica "],compreensao:2})`);
  assert.equal(run("st.temas.length"),1);
  const s=run(`suggestThemes(st,"Matemática","quad")`);assert.equal(s.sugestoes[0].nome,"Função quadrática");
  assert.equal(run(`suggestThemes(st,"Matemática","Funcão quadratica").parecido`),null,"igual sem acentos conta como o mesmo");
  assert.equal(run(`suggestThemes(st,"Matemática","Função quadrátca").parecido.nome`),"Função quadrática");
});
t("revisão espaçada 1, 3 e 7 dias",()=>{
  run(`st=emptyState("2026-09-28");addSession(st,{data:"2026-09-28",disciplina:"Matemática",minutos:45,temas:["Vetores"],compreensao:2})`);
  assert.equal(run(`reviewsDue(st,"2026-09-28").length`),0);
  let due=run(`reviewsDue(st,"2026-09-29")`);assert.equal(due[0].etapa.tipo,"1 dia");
  run(`markReviewed(st,st.temas[0],"2026-09-29",1)`);
  assert.equal(run(`reviewsDue(st,"2026-09-30").length`),0);
  due=run(`reviewsDue(st,"2026-10-01")`);assert.equal(due[0].etapa.tipo,"3 dias");
  run(`markReviewed(st,st.temas[0],"2026-10-01",1)`);
  due=run(`reviewsDue(st,"2026-10-05")`);assert.equal(due[0].etapa.tipo,"7 dias");
  run(`markReviewed(st,st.temas[0],"2026-10-05",1)`);
  // teste de Matemática a 13/10: janela 10–12/10
  assert.equal(run(`reviewsDue(st,"2026-10-09").length`),0);
  due=run(`reviewsDue(st,"2026-10-10")`);assert.equal(due[0].etapa.tipo,"antes do teste");
  assert.equal(run(`reviewsDue(st,"2026-10-13").length`),0,"no dia do teste já não aparece");
});
t("revisão atrasada não salta etapas",()=>{
  run(`st=emptyState("2026-09-28");addSession(st,{data:"2026-09-28",disciplina:"Filosofia",minutos:45,temas:["Lógica"],compreensao:3})`);
  run(`markReviewed(st,st.temas[0],"2026-10-02",2)`); // 1.ª revisão feita tarde
  assert.equal(run(`reviewsDue(st,"2026-10-03")[0].etapa.tipo`),"3 dias");
});
t("relatório mensal",()=>{
  run(`st=emptyState("2026-09-28");addSession(st,{data:"2026-09-28",disciplina:"Físico-Química",minutos:50,temas:["Mole"],compreensao:3})`);
  const r=run(`monthlyReport(st,"2026-09")`);
  const fq=r.linhas.find(l=>l.s==="Físico-Química");assert.equal(fq.feitos,50);assert.equal(fq.planeados,3*45);
  assert.equal(r.confusos[0].nome,"Mole");assert.equal(r.testes.length,7);
  assert.match(run(`reportText(monthlyReport(st,"2026-09"))`),/Testes em outubro de 2026/);
});
t("cópia de segurança validada",()=>{
  assert.equal(run(`validateBackup(JSON.parse(JSON.stringify(st)))`),null);
  assert.ok(run(`validateBackup({a:1})`));
});
console.log(`\n${n} testes passaram`);
