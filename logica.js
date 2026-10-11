// Regras do caderno: plano, replaneamento, revisão espaçada e relatório.
// Funções puras sobre o estado `st`; não mexem no ecrã.

/* ---------- datas ---------- */
const MESES=["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
const DIAS=["domingo","segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado"];
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const parse=s=>{const[y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)};
const addDays=(s,n)=>{const d=parse(s);d.setDate(d.getDate()+n);return iso(d)};
const dow=s=>parse(s).getDay();
const daysBetween=(a,b)=>Math.round((parse(b)-parse(a))/86400000);
const fmt=s=>{const d=parse(s);return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}`};
const fmtLong=s=>{const d=parse(s);return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`};
const fmtShort=s=>`${DIAS[dow(s)].slice(0,3)} ${fmt(s)}`;

/* ---------- nomes de temas ---------- */
const norm=t=>String(t||"").trim().replace(/\s+/g," ");
const key=t=>norm(t).toLocaleLowerCase("pt-PT").normalize("NFD").replace(/[̀-ͯ]/g,"");
function lev(a,b){
  if(Math.abs(a.length-b.length)>2)return 9;
  const v=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){let p=v[0];v[0]=i;
    for(let j=1;j<=b.length;j++){const t=v[j];v[j]=Math.min(v[j]+1,v[j-1]+1,p+(a[i-1]===b[j-1]?0:1));p=t}}
  return v[b.length];
}

/* ---------- calendário escolar ---------- */
const LAST_DAY=TESTS[TESTS.length-1].d;
const inBreak=s=>BREAKS.some(([a,b])=>s>=a&&s<=b);
// Início e fim de período marcam o calendário, mas são dias de aulas normais.
const blockingEvent=s=>EVENTS.find(e=>e.d===s&&!/^(Início|Fim) d/.test(e.t));
const isBlocked=s=>inBreak(s)||!!blockingEvent(s);
const isStudyDay=s=>!!SLOT[dow(s)]&&!isBlocked(s)&&s>=PLAN_START&&s<=LAST_DAY;
const testsOn=s=>TESTS.filter(t=>t.d===s);
const eventsOn=s=>EVENTS.filter(e=>e.d===s);
const nextTest=(subj,after)=>TESTS.find(t=>t.s===subj&&t.d>after)||null;
const isTestDayOf=(subj,s)=>TESTS.some(t=>t.s===subj&&t.d===s);
function nextStudyDay(after){let s=addDays(after,1);while(s<=LAST_DAY){if(isStudyDay(s))return s;s=addDays(s,1)}return null}

// Nenhuma sessão num dia bloqueado nem no dia do teste dessa disciplina.
const PLAN=PLAN_BASE.filter(p=>isStudyDay(p.d)&&!isTestDayOf(p.s,p.d));

/* ---------- estado ---------- */
function emptyState(today){
  return {versao:1,inicio:today,sessoes:[],temas:[],recuperacoes:[],dispensadas:[],ultimaCopia:null};
}
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const pkey=(d,s)=>`${d}|${s}`;

/* ---------- plano e replaneamento ---------- */
function planEntries(st){
  return [...PLAN.map(p=>({d:p.d,s:p.s,tipo:"plano"})),
          ...st.recuperacoes.map(r=>({d:r.d,s:r.s,tipo:"recuperacao",origem:r.origem,id:r.id}))]
    .sort((a,b)=>a.d.localeCompare(b.d));
}
const planOn=(st,d)=>planEntries(st).filter(p=>p.d===d);
const isDone=(st,d,s)=>st.sessoes.some(x=>x.data===d&&x.disciplina===s);

// Sessões planeadas que já passaram sem registo (desde que a app começou a ser usada).
function missed(st,today){
  const handled=new Set([...st.dispensadas,...st.recuperacoes.map(r=>r.origem)]);
  return planEntries(st).filter(p=>p.d<today&&p.d>=st.inicio&&!isDone(st,p.d,p.s)&&!handled.has(pkey(p.d,p.s)));
}

// Para cada sessão falhada propõe a sessão seguinte. Havendo várias, a do teste
// mais próximo fica com a primeira hora livre (rotação por proximidade do teste).
function recoveryProposals(st,today){
  const miss=missed(st,today).map(m=>({...m,teste:nextTest(m.s,m.d)}));
  miss.sort((a,b)=>(a.teste?.d||"9").localeCompare(b.teste?.d||"9")||a.d.localeCompare(b.d));
  const taken=new Set(st.recuperacoes.filter(r=>r.d>=today).map(r=>r.d));
  const out=[];
  for(const m of miss){
    if(!m.teste){out.push({...m,alvo:null,motivo:"sem teste"});continue}
    let t=nextStudyDay(addDays(today,-1)>m.d?addDays(today,-1):m.d);
    // Salta horas já ocupadas por outra recuperação ou que já têm esta disciplina no plano.
    while(t&&(taken.has(t)||planOn(st,t).some(p=>p.s===m.s)))t=nextStudyDay(t);
    if(!t||t>=m.teste.d){out.push({...m,alvo:null,motivo:"teste"});continue}
    taken.add(t);out.push({...m,alvo:t});
  }
  return out;
}
function acceptRecovery(st,p){
  if(!p.alvo||isTestDayOf(p.s,p.alvo))return false;
  st.recuperacoes.push({id:uid(),d:p.alvo,s:p.s,origem:pkey(p.d,p.s)});return true;
}
function dismissMissed(st,p){st.dispensadas.push(pkey(p.d,p.s))}

/* ---------- temas ---------- */
const themesOf=(st,subj)=>st.temas.filter(t=>t.s===subj);
const findTheme=(st,subj,name)=>st.temas.find(t=>t.s===subj&&key(t.nome)===key(name));
function ensureTheme(st,subj,name,d){
  let t=findTheme(st,subj,name);
  if(!t){t={id:uid(),s:subj,nome:norm(name),criado:d,revisoes:[],cartoes:[]};st.temas.push(t)}
  else if(d<t.criado)t.criado=d;
  return t;
}
// Sugestões enquanto escreve: nomes já usados que contêm o texto, e aviso de nomes parecidos.
function suggestThemes(st,subj,text){
  const k=key(text);const list=themesOf(st,subj);
  if(!k)return {sugestoes:list.slice().sort((a,b)=>lastStudied(st,b).localeCompare(lastStudied(st,a))).slice(0,8),parecido:null};
  const sug=list.filter(t=>key(t.nome).includes(k)&&key(t.nome)!==k)
    .sort((a,b)=>key(b.nome).startsWith(k)-key(a.nome).startsWith(k)||a.nome.localeCompare(b.nome,"pt")).slice(0,8);
  const exact=list.some(t=>key(t.nome)===k);
  const parecido=!exact&&k.length>=4?list.find(t=>lev(key(t.nome),k)<=2)||null:null;
  return {sugestoes:sug,parecido};
}

// Todas as vezes que o tema foi trabalhado: sessões em que aparece e revisões marcadas.
function themeLog(st,t){
  const k=key(t.nome);
  const out=[];
  for(const x of st.sessoes)if(x.disciplina===t.s&&(x.temas||[]).some(n=>key(n)===k))out.push({d:x.data,u:x.compreensao});
  for(const r of t.revisoes)out.push({d:r.d,u:r.u});
  return out.sort((a,b)=>a.d.localeCompare(b.d));
}
const lastStudied=(st,t)=>{const l=themeLog(st,t);return l.length?l[l.length-1].d:t.criado};
function lastUnderstanding(st,t){const l=themeLog(st,t).filter(x=>x.u);return l.length?l[l.length-1].u:2}
function isConfused(st,t){return lastUnderstanding(st,t)===3||t.cartoes.some(c=>c.ultimo==="errei")}

// Revisão espaçada: 1, 3 e 7 dias depois da primeira vez, e nos 3 dias antes do teste.
const STAGES=[1,3,7];
function reviewPlan(st,t,today){
  const log=themeLog(st,t);
  const start=log.length?log[0].d:t.criado;
  const dates=[...new Set(log.map(x=>x.d))].filter(d=>d>start).sort();
  const etapas=[];let prev=start;
  for(const off of STAGES){
    const due=[addDays(start,off),addDays(prev,1)].sort()[1];
    const doneAt=dates.find(d=>d>=due&&d>prev);
    etapas.push({tipo:`${off} ${off===1?"dia":"dias"}`,due,feita:doneAt||null});
    if(!doneAt){for(const o of STAGES.slice(STAGES.indexOf(off)+1))etapas.push({tipo:`${o} dias`,due:addDays(start,o),feita:null});break}
    prev=doneAt;
  }
  const teste=nextTest(t.s,today>start?addDays(today,-1):start);
  if(teste&&teste.d>start){
    const from=addDays(teste.d,-3),to=addDays(teste.d,-1);
    const feita=dates.find(d=>d>=from&&d<=to)||null;
    etapas.push({tipo:"antes do teste",due:from,ate:to,teste:teste.d,feita});
  }
  return etapas;
}
// Revisões a fazer hoje (inclui as que ficaram atrasadas).
function reviewsDue(st,today){
  const out=[];
  for(const t of st.temas){
    const e=reviewPlan(st,t,today);
    const spaced=e.find(x=>x.tipo!=="antes do teste"&&!x.feita);
    const pre=e.find(x=>x.tipo==="antes do teste");
    if(pre&&!pre.feita&&today>=pre.due&&today<=pre.ate)out.push({tema:t,etapa:pre});
    else if(spaced&&spaced.due<=today)out.push({tema:t,etapa:spaced});
  }
  return out.sort((a,b)=>a.etapa.due.localeCompare(b.etapa.due));
}
function markReviewed(st,t,d,u){t.revisoes.push({d,u})}

/* ---------- sessões ---------- */
function addSession(st,s){
  const seen=new Map();for(const n of (s.temas||[]).map(norm).filter(Boolean))if(!seen.has(key(n)))seen.set(key(n),n);
  const temas=[...seen.values()];
  const rec={id:uid(),data:s.data,disciplina:s.disciplina,minutos:Math.max(1,Math.round(+s.minutos||0)),
    temas:[],compreensao:+s.compreensao||2,notas:norm(s.notas||""),criadoEm:new Date().toISOString()};
  for(const n of temas){const t=ensureTheme(st,rec.disciplina,n,rec.data);rec.temas.push(t.nome)}
  st.sessoes.push(rec);st.sessoes.sort((a,b)=>b.data.localeCompare(a.data));
  return rec;
}
function deleteSession(st,id){st.sessoes=st.sessoes.filter(x=>x.id!==id)}

/* ---------- relatório mensal ---------- */
function monthlyReport(st,ym){
  const [y,m]=ym.split("-").map(Number);
  const nxt=m===12?`${y+1}-01`:`${y}-${String(m+1).padStart(2,"0")}`;
  const inM=d=>d.startsWith(ym);
  const linhas=SUBJECTS.map(s=>{
    const feitos=st.sessoes.filter(x=>x.disciplina===s&&inM(x.data)).reduce((a,x)=>a+x.minutos,0);
    const planeados=PLAN.filter(p=>p.s===s&&inM(p.d)).length*SESSION_MIN;
    return {s,feitos,planeados};
  });
  const confusos=st.temas.filter(t=>isConfused(st,t)).map(t=>({s:t.s,nome:t.nome,ultima:lastStudied(st,t),
    cartoesErrados:t.cartoes.filter(c=>c.ultimo==="errei").length})).sort((a,b)=>SUBJECTS.indexOf(a.s)-SUBJECTS.indexOf(b.s));
  const testes=TESTS.filter(t=>t.d.startsWith(nxt));
  const total={feitos:linhas.reduce((a,l)=>a+l.feitos,0),planeados:linhas.reduce((a,l)=>a+l.planeados,0)};
  return {ym,proximo:nxt,linhas,confusos,testes,total};
}
const monthName=ym=>{const[y,m]=ym.split("-").map(Number);return `${MESES[m-1]} de ${y}`};
const hm=n=>n>=60?`${Math.floor(n/60)} h ${String(n%60).padStart(2,"0")}`:`${n} min`;
function reportText(r){
  const L=[`Relatório de estudo · ${monthName(r.ym)}`,"",`Total: ${hm(r.total.feitos)} de ${hm(r.total.planeados)} planeados`,"","Minutos por disciplina (feitos / planeados):"];
  for(const l of r.linhas)if(l.feitos||l.planeados)L.push(`• ${l.s}: ${l.feitos} / ${l.planeados}`);
  L.push("","Temas ainda confusos:");
  if(r.confusos.length)for(const c of r.confusos)L.push(`• ${c.s} — ${c.nome}`);else L.push("• nenhum");
  L.push("",`Testes em ${monthName(r.proximo)}:`);
  if(r.testes.length)for(const t of r.testes)L.push(`• ${fmtShort(t.d)} ${t.h} — ${t.s}`);else L.push("• nenhum");
  return L.join("\n");
}

/* ---------- cópia de segurança ---------- */
function validateBackup(o){
  if(!o||typeof o!=="object"||o.versao!==1)return "Este ficheiro não é uma cópia do caderno.";
  for(const k of ["sessoes","temas","recuperacoes","dispensadas"])if(!Array.isArray(o[k]))return "A cópia está incompleta.";
  if(typeof o.inicio!=="string")return "A cópia está incompleta.";
  return null;
}

