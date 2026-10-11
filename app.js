// Núcleo da app: guardar no aparelho, navegação, ecrã Hoje e Calendário.

/* ---------- ajudas ---------- */
const $=s=>document.querySelector(s);
const el=(tag,attrs={},...kids)=>{const n=document.createElement(tag);
  for(const[k,v]of Object.entries(attrs)){if(k==="class")n.className=v;else if(k==="style")n.style.cssText=v;
    else if(k.startsWith("on"))n.addEventListener(k.slice(2),v);else if(v!==undefined&&v!==null&&v!==false)n.setAttribute(k,v===true?"":v)}
  for(const c of kids.flat()){if(c==null||c===false)continue;n.append(c.nodeType?c:document.createTextNode(String(c)))}return n};
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
const dot=s=>el("i",{class:"sw",style:`background:${COLORS[s]}`});
const UND={1:["Percebi bem","ok"],2:["Mais ou menos","warn"],3:["Ainda confuso","bad"]};
let TODAY=iso(new Date());
// Duas colunas em ecrã grande; no telemóvel as colunas desaparecem e fica tudo seguido, pela mesma ordem.
function split(v){const a=el("div",{class:"col"}),b=el("div",{class:"col"});v.append(el("div",{class:"split"},a,b));return [a,b]}
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("on");clearTimeout(toast.h);toast.h=setTimeout(()=>t.classList.remove("on"),2600)}

/* ---------- guardar no aparelho ---------- */
const STORE="caderno-estudo.v1";
let st;
function load(){
  try{const o=JSON.parse(localStorage.getItem(STORE)||"null");if(o&&!validateBackup(o))return o}catch{}
  return emptyState(TODAY);
}
function save(){
  try{localStorage.setItem(STORE,JSON.stringify(st))}
  catch{toast("Não foi possível guardar neste aparelho. Faz uma cópia de segurança em Mais.")}
}
function commit(){save();render()}

/* ---------- navegação ---------- */
const ui={v:"hoje",month:null,sel:TODAY,subj:null,tema:null,reg:{data:null,disc:null}};
function go(v){
  ui.v=v;
  for(const b of document.querySelectorAll(".tabbar button"))b.dataset.v===v?b.setAttribute("aria-current","page"):b.removeAttribute("aria-current");
  for(const s of document.querySelectorAll(".view"))s.hidden=s.id!=="v-"+v;
  render();window.scrollTo(0,0);
}
document.querySelectorAll(".tabbar button").forEach(b=>b.addEventListener("click",()=>go(b.dataset.v)));
function render(){
  $("#hoje-data").textContent=cap(fmtLong(TODAY));
  ({hoje:renderHoje,cal:renderCal,reg:renderReg,tem:renderTemas,mais:renderMais})[ui.v]();
}
function openReg(data,disc){ui.reg={data,disc};go("reg")}

/* ---------- Hoje ---------- */
function upcomingTests(n){return TESTS.filter(t=>t.d>=TODAY).slice(0,n)}
const inDays=d=>{const n=daysBetween(TODAY,d);return n===0?"hoje":n===1?"amanhã":`em ${n} dias`};

function renderHoje(){
  const v=$("#v-hoje");v.replaceChildren();
  const [a,b]=split(v);

  // Sessão de hoje
  const card=el("div",{class:"card"},el("h2",{},"Estudo de hoje"));
  const plan=planOn(st,TODAY);
  if(plan.length){
    for(const p of plan){
      const t=nextTest(p.s,TODAY);const feito=isDone(st,TODAY,p.s);
      card.append(el("div",{class:"today-slot"},
        el("div",{class:"t"},p.s),
        el("div",{class:"s"},[SLOT[dow(TODAY)],p.tipo==="recuperacao"?"recuperação":null,t?`teste ${fmtShort(t.d)}`:null].filter(Boolean).join(" · ")),
        el("div",{class:"btns",style:"margin-top:6px"},feito?el("span",{class:"done"},"✓ Feito"):el("button",{class:"btn",onclick:()=>openReg(TODAY,p.s)},"Registar sessão"))));
    }
  }else{
    const ev=blockingEvent(TODAY);
    card.append(el("p",{class:"muted",style:"margin:0"},inBreak(TODAY)?"Interrupção letiva: não há sessões de estudo.":ev?`${ev.t}: não há sessão de estudo.`:"Hoje não há hora de estudo marcada."));
    const n=nextStudyDay(TODAY);
    if(n)card.append(el("p",{class:"s",style:"margin:6px 0 0;font-size:14px;color:var(--ink-2)"},`Próxima: ${fmtShort(n)}, ${SLOT[dow(n)]} · ${planOn(st,n).map(p=>p.s).join(", ")||"—"}`));
  }
  a.append(card);

  // Recuperar sessões falhadas
  const props=recoveryProposals(st,TODAY);
  if(props.length){
    const c=el("div",{class:"card"},el("h2",{},"Sessões por recuperar",el("span",{class:"count"},props.length)));
    for(const p of props){
      const txt=p.alvo?`Falhou ${fmtShort(p.d)}. Recuperar na sessão seguinte, ${fmtShort(p.alvo)}?`
        :p.motivo==="teste"?`Falhou ${fmtShort(p.d)}. Já não há hora de estudo antes do teste de ${fmt(p.teste.d)}.`:`Falhou ${fmtShort(p.d)}.`;
      c.append(el("div",{class:"row"},dot(p.s),
        el("div",{class:"grow"},el("div",{class:"t"},p.s),el("div",{class:"s"},txt)),
        el("div",{class:"btns",style:"flex-direction:column;align-items:stretch"},
          p.alvo?el("button",{class:"btn sm",onclick:()=>{acceptRecovery(st,p);commit();toast(`${p.s} marcada para ${fmtShort(p.alvo)}.`)}},"Recuperar"):null,
          el("button",{class:"btn sm quiet",onclick:()=>{dismissMissed(st,p);commit()}},p.alvo?"Dispensar":"OK"))));
    }
    a.append(c);
  }

  // Revisões
  const due=reviewsDue(st,TODAY);
  const rc=el("div",{class:"card"},el("h2",{},"Revisões para hoje",due.length?el("span",{class:"count"},due.length):null));
  if(!due.length)rc.append(el("p",{class:"muted",style:"margin:0"},st.temas.length?"Nada para rever hoje.":"Os temas que registares voltam aqui 1, 3 e 7 dias depois e antes do teste."));
  for(const {tema,etapa} of due)rc.append(reviewRow(tema,etapa));
  a.append(rc);

  // Próximos testes
  const tc=el("div",{class:"card"},el("h2",{},"Próximos testes"));
  const up=upcomingTests(6);
  tc.append(up.length?el("div",{class:"tests"},up.map(t=>el("button",{class:"test",style:`--c:${COLORS[t.s]}`,onclick:()=>{ui.sel=t.d;ui.month=null;go("cal")}},
    el("div",{class:"d"},`${fmtShort(t.d)} · ${t.h}`),el("div",{class:"n"},t.s),el("div",{class:"k"},inDays(t.d))))):el("p",{class:"muted"},"Não há mais testes este ano."));
  b.append(tc);

  // Lembrete da cópia de segurança
  const age=st.ultimaCopia?daysBetween(st.ultimaCopia.slice(0,10),TODAY):null;
  if(st.sessoes.length>=3&&(age===null||age>=14))
    b.append(el("div",{class:"note warn"},age===null?"Ainda não fizeste nenhuma cópia de segurança. ":`A última cópia de segurança foi há ${age} dias. `,
      el("button",{class:"btn sm ghost",style:"margin-left:6px",onclick:()=>go("mais")},"Fazer cópia")));
}

function reviewRow(tema,etapa){
  const nCards=tema.cartoes.length;
  const row=el("div",{class:"row"},dot(tema.s),
    el("div",{class:"grow"},el("div",{class:"t"},tema.nome),
      el("div",{class:"s"},`${tema.s} · ${etapa.tipo==="antes do teste"?`antes do teste de ${fmt(etapa.teste)}`:`revisão de ${etapa.tipo}`}${etapa.due<TODAY&&etapa.tipo!=="antes do teste"?" · atrasada":""}`)),
    el("div",{class:"btns",style:"flex-direction:column;align-items:stretch"},
      nCards?el("button",{class:"btn sm ghost",onclick:()=>startTraining(tema.cartoes.map(c=>[tema,c]),tema)},`Cartões (${nCards})`):null,
      el("button",{class:"btn sm",onclick:()=>askUnderstanding(row,tema)},"Revi")));
  return row;
}
// Depois de rever, pergunta como correu (conta para os temas confusos no relatório).
function askUnderstanding(row,tema){
  row.replaceChildren(dot(tema.s),el("div",{class:"grow"},el("div",{class:"t"},tema.nome),el("div",{class:"s"},"Como correu a revisão?")),
    el("div",{class:"btns",style:"flex-direction:column;align-items:stretch"},
      [1,2,3].map(u=>el("button",{class:"btn sm "+(u===1?"":"ghost"),onclick:()=>{markReviewed(st,tema,TODAY,u);commit();toast("Revisão registada.")}},UND[u][0]))));
}

/* ---------- Calendário ---------- */
function renderCal(){
  const v=$("#v-cal");v.replaceChildren();
  if(!ui.month){const s=parse(ui.sel||TODAY);ui.month=new Date(s.getFullYear(),s.getMonth(),1)}
  const m=ui.month;
  const shift=n=>{ui.month=new Date(m.getFullYear(),m.getMonth()+n,1);renderCal()};
  const card=el("div",{class:"card"},
    el("div",{class:"calhead"},el("button",{class:"nav","aria-label":"Mês anterior",onclick:()=>shift(-1)},"‹"),
      el("h2",{},`${MESES[m.getMonth()]} ${m.getFullYear()}`),
      el("div",{class:"btns"},el("button",{class:"btn sm ghost",onclick:()=>{ui.sel=TODAY;ui.month=null;renderCal()}},"Hoje"),
        el("button",{class:"nav","aria-label":"Mês seguinte",onclick:()=>shift(1)},"›"))));
  const g=el("div",{class:"cal"},["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"].map(d=>el("div",{class:"dow"},d)));
  const first=new Date(m.getFullYear(),m.getMonth(),1);const start=new Date(first);start.setDate(1-((first.getDay()+6)%7));
  for(let i=0;i<42;i++){
    const d=new Date(start);d.setDate(start.getDate()+i);
    if(i>=35&&d.getMonth()!==m.getMonth())break;
    const s=iso(d),out=d.getMonth()!==m.getMonth(),wk=d.getDay()%6===0;
    const ts=testsOn(s),ps=planOn(st,s),es=eventsOn(s),mins=st.sessoes.filter(x=>x.data===s).reduce((a,x)=>a+x.minutos,0);
    const extra=st.sessoes.filter(x=>x.data===s&&!ps.some(p=>p.s===x.disciplina));
    const label=[fmtLong(s),...ts.map(t=>"teste de "+t.s),...ps.map(p=>`estudo ${isDone(st,s,p.s)?"feito":"planeado"}: ${p.s}`),...es.map(e=>e.t)].join("; ");
    g.append(el("button",{class:["day",out&&"out",wk&&"wk",inBreak(s)&&"brk",s===TODAY&&"today",s===ui.sel&&"sel"].filter(Boolean).join(" "),"aria-label":label,onclick:()=>{ui.sel=s;renderCal()}},
      el("span",{class:"dn"},d.getDate(),mins?el("span",{style:"float:right;color:var(--study)"},`${mins}′`):null),
      ts.map(t=>el("span",{class:"pill t",style:`--c:${COLORS[t.s]}`},t.s)),
      ps.map(p=>el("span",{class:"pill p"+(isDone(st,s,p.s)?" feito":"")},(p.tipo==="recuperacao"?"↺ ":"")+p.s)),
      extra.map(x=>el("span",{class:"pill p feito"},x.disciplina)),
      es.map(e=>el("span",{class:"pill e"},e.t))));
  }
  card.append(g,el("div",{class:"legend"},
    el("span",{},el("i",{style:"background:#F5D9A8;box-shadow:inset 3px 0 0 var(--test)"}),"Teste (cor da disciplina)"),
    el("span",{},el("i",{style:"box-shadow:inset 0 0 0 1.5px var(--study)"}),"Estudo planeado"),
    el("span",{},el("i",{style:"background:var(--study)"}),"Estudo feito"),
    el("span",{},el("i",{style:"background:repeating-linear-gradient(135deg,var(--sheet) 0 3px,var(--grid) 3px 5px);box-shadow:inset 0 0 0 1px var(--line)"}),"Interrupção letiva")));
  const [a,b]=split(v);a.append(card);b.append(dayDetail(ui.sel));
}
function dayDetail(s){
  const c=el("div",{class:"card"},el("h2",{},cap(fmtLong(s))));
  const ts=testsOn(s),ps=planOn(st,s),es=eventsOn(s),ss=st.sessoes.filter(x=>x.data===s);
  if(es.length||inBreak(s))c.append(el("p",{class:"muted",style:"margin:0 0 6px"},[...es.map(e=>e.t),inBreak(s)?"Interrupção letiva":null].filter(Boolean).join(" · ")));
  if(ts.length){c.append(el("div",{class:"lbl"},"Testes"));for(const t of ts)c.append(el("div",{class:"row"},dot(t.s),el("div",{class:"grow t"},t.s),el("span",{class:"num muted"},t.h)))}
  if(ps.length){
    c.append(el("div",{class:"lbl"},"Estudo planeado"));
    for(const p of ps){const t=nextTest(p.s,s);const feito=isDone(st,s,p.s);
      c.append(el("div",{class:"row"},el("i",{class:"sw study"}),
        el("div",{class:"grow"},el("div",{class:"t"},p.s),el("div",{class:"s"},[SLOT[dow(s)],p.tipo==="recuperacao"?"recuperação":null,t?`teste ${fmt(t.d)}`:null].filter(Boolean).join(" · "))),
        feito?el("span",{class:"done"},"✓ Feito"):s<=TODAY?el("button",{class:"btn sm",onclick:()=>openReg(s,p.s)},"Registar"):null));}
  }
  c.append(el("div",{class:"lbl"},"Estudo registado"));
  if(ss.length)for(const x of ss)c.append(el("div",{class:"row"},dot(x.disciplina),
    el("div",{class:"grow"},el("div",{class:"t"},x.disciplina),el("div",{class:"s"},x.temas.join(", ")||"sem temas")),el("span",{class:"num",style:"color:var(--study)"},`${x.minutos}′`)));
  else c.append(el("p",{class:"muted",style:"margin:0"},"Nada registado."));
  if(s<=TODAY)c.append(el("div",{class:"btns",style:"margin-top:10px"},el("button",{class:"btn sm ghost",onclick:()=>openReg(s,ps[0]?.s)},"Registar estudo neste dia")));
  return c;
}
