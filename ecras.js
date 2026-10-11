// Ecrãs Registar, Temas e Mais; treino com cartões; arranque da app.

/* ---------- escolher temas com sugestões ---------- */
// Caixa de temas: sugere nomes já usados enquanto escreve e avisa quando um nome é parecido.
function themePicker(getSubj,initial=[]){
  const chosen=[...initial];
  const input=el("input",{type:"text",placeholder:"escreve um tema e carrega Enter","aria-label":"Temas estudados",autocomplete:"off",enterkeyhint:"done"});
  const box=el("div",{class:"tagbox"}),sugg=el("div",{class:"sugg"}),sim=el("div",{class:"similar",hidden:true});
  function add(name){name=norm(name);if(!name)return;
    const ex=findTheme(st,getSubj(),name);if(ex)name=ex.nome;
    if(!chosen.some(c=>key(c)===key(name)))chosen.push(name);input.value="";draw()}
  function draw(){
    box.replaceChildren(...chosen.map((c,i)=>el("span",{class:"chosen"},c,el("button",{type:"button","aria-label":`Tirar ${c}`,onclick:()=>{chosen.splice(i,1);draw()}},"×"))),input);
    const {sugestoes,parecido}=suggestThemes(st,getSubj(),input.value);
    const list=sugestoes.filter(t=>!chosen.some(c=>key(c)===key(t.nome)));
    sugg.replaceChildren(...(list.length?[el("span",{class:"hint",style:"align-self:center"},input.value?"Já usados:":"Recentes:")]:[]),
      ...list.map(t=>el("button",{type:"button",onclick:()=>{add(t.nome);input.focus()}},t.nome)));
    sim.hidden=!parecido;
    if(parecido)sim.replaceChildren(`Parecido com «${parecido.nome}».`,el("button",{type:"button",class:"btn sm ghost",onclick:()=>{input.value="";add(parecido.nome);input.focus()}},`Usar «${parecido.nome}»`));
  }
  input.addEventListener("input",()=>{if(input.value.includes(",")){input.value.split(",").slice(0,-1).forEach(add);input.value=input.value.split(",").pop()}draw()});
  input.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();add(input.value)}
    else if(e.key==="Backspace"&&!input.value&&chosen.length){chosen.pop();draw()}});
  draw();
  return {node:el("div",{},box,sim,sugg),values:()=>{if(norm(input.value))add(input.value);return chosen},redraw:draw,clear:()=>{chosen.length=0;draw()}};
}

/* ---------- Registar ---------- */
function renderReg(){
  const v=$("#v-reg");v.replaceChildren();
  const [a,b]=split(v);
  const data=ui.reg.data||TODAY;
  const disc=ui.reg.disc||planOn(st,data)[0]?.s||SUBJECTS[0];
  ui.reg={data:null,disc:null};
  const fDate=el("input",{type:"date",id:"f-d",value:data,max:TODAY,required:true});
  const fSub=el("select",{id:"f-s",required:true},SUBJECTS.map(s=>el("option",{value:s,selected:s===disc},s)));
  const fMin=el("input",{type:"number",id:"f-m",min:5,max:300,step:5,value:SESSION_MIN,inputmode:"numeric",required:true});
  const picker=themePicker(()=>fSub.value);
  fSub.addEventListener("change",picker.redraw);
  const fNotes=el("textarea",{id:"f-n",placeholder:"ex.: não percebo quando o discriminante é negativo"});
  const form=el("form",{autocomplete:"off"},
    el("div",{class:"fields"},
      el("label",{class:"f"},"Data",fDate),
      el("label",{class:"f"},"Minutos",fMin),
      el("label",{class:"f wide"},"Disciplina",fSub)),
    el("div",{class:"f",style:"display:grid;gap:4px;font-size:13.5px;font-weight:650;color:var(--ink-2)"},"Temas estudados",picker.node,
      el("span",{class:"hint"},"Usa sempre o mesmo nome para o mesmo tema. Cada tema volta a aparecer para revisão 1, 3 e 7 dias depois e antes do teste.")),
    el("fieldset",{style:"border:0;padding:0;margin:0;display:grid;gap:6px"},
      el("legend",{style:"font-size:13.5px;font-weight:650;color:var(--ink-2);margin-bottom:6px"},"Como correu a compreensão?"),
      el("div",{class:"seg"},[1,2,3].map(u=>el("label",{},el("input",{type:"radio",name:"und",value:u,checked:u===2}),UND[u][0])))),
    el("label",{class:"f"},el("span",{},"O que ficou por perceber ",el("span",{class:"hint"},"(opcional)")),fNotes),
    el("button",{class:"btn",type:"submit"},"Guardar sessão"));
  form.addEventListener("submit",e=>{
    e.preventDefault();
    if(!fDate.value||fDate.value>TODAY){toast("Escolhe uma data até hoje.");return}
    const s=addSession(st,{data:fDate.value,disciplina:fSub.value,minutos:fMin.value,temas:picker.values(),
      compreensao:+form.querySelector('input[name="und"]:checked').value,notas:fNotes.value});
    commit();toast(`Guardado: ${s.disciplina}, ${s.minutos} min.`);
  });
  a.append(el("div",{class:"card"},el("h2",{},"Registar uma sessão"),form));

  // Sessões recentes
  const list=el("div",{class:"card"},el("h2",{},"Sessões registadas",el("span",{class:"count"},st.sessoes.length)));
  if(!st.sessoes.length)list.append(el("p",{class:"muted",style:"margin:0"},"Ainda não há sessões. Depois de cada hora de estudo, regista aqui a disciplina, o tempo e os temas."));
  for(const x of st.sessoes.slice(0,30)){
    const del=el("button",{class:"btn sm bad",onclick:()=>{
      if(del.dataset.arm){deleteSession(st,x.id);commit();toast("Sessão apagada.")}
      else{del.dataset.arm="1";del.textContent="Confirmar";setTimeout(()=>{if(del.isConnected){delete del.dataset.arm;del.textContent="Apagar"}},4000)}}},"Apagar");
    list.append(el("div",{class:"row"},dot(x.disciplina),
      el("div",{class:"grow"},el("div",{class:"t"},`${x.disciplina} `,el("span",{class:"tag "+UND[x.compreensao][1]},UND[x.compreensao][0])),
        el("div",{class:"s"},`${fmtShort(x.data)} · ${x.minutos} min${x.temas.length?" · "+x.temas.join(", "):""}`),
        x.notas?el("div",{class:"s muted"},x.notas):null),del));
  }
  b.append(list);
}

/* ---------- Temas ---------- */
function renderTemas(){
  const v=$("#v-tem");v.replaceChildren();
  if(ui.tema){const t=st.temas.find(x=>x.id===ui.tema);if(t)return themeDetail(v,t);ui.tema=null}
  if(!ui.subj){const n=TESTS.find(t=>t.d>TODAY);ui.subj=n?n.s:SUBJECTS[0]}
  v.append(el("div",{class:"subjects",role:"group","aria-label":"Disciplina"},SUBJECTS.map(s=>el("button",{"aria-pressed":String(s===ui.subj),onclick:()=>{ui.subj=s;renderTemas()}},
    dot(s),s,themesOf(st,s).length?el("span",{class:"num muted",style:"font-size:12px"},themesOf(st,s).length):null))));
  const s=ui.subj,list=themesOf(st,s);
  const nt=nextTest(s,addDays(TODAY,-1));
  const allCards=list.flatMap(t=>t.cartoes.map(c=>[t,c]));
  const card=el("div",{class:"card"},el("h2",{},dot(s),s),
    el("p",{class:"muted",style:"margin:-4px 0 10px;font-size:14px"},nt?`Próximo teste: ${fmtShort(nt.d)} (${inDays(nt.d)})`:"Sem testes por fazer."),
    allCards.length?el("div",{class:"btns",style:"margin-bottom:6px"},el("button",{class:"btn sm",onclick:()=>startTraining(allCards)},`Autoteste com todos os cartões (${allCards.length})`)):null);
  if(!list.length)card.append(el("p",{class:"muted",style:"margin:0"},"Ainda não há temas nesta disciplina. Aparecem aqui quando os indicas ao registar uma sessão, ou podes criá-los abaixo."));
  const sorted=list.slice().sort((a,b)=>isConfused(st,b)-isConfused(st,a)||lastStudied(st,b).localeCompare(lastStudied(st,a)));
  for(const t of sorted){
    const u=lastUnderstanding(st,t),conf=isConfused(st,t);
    const next=reviewPlan(st,t,TODAY).find(e=>!e.feita&&!(e.tipo==="antes do teste"&&TODAY>e.ate));
    card.append(el("button",{class:"theme",onclick:()=>{ui.tema=t.id;renderTemas();window.scrollTo(0,0)}},
      el("div",{class:"top2"},el("span",{class:"t"},t.nome),el("span",{class:"tag "+(conf?"bad":UND[u][1])},conf?"Confuso":UND[u][0])),
      el("div",{class:"s"},[`última vez ${fmt(lastStudied(st,t))}`,next?`revisão ${next.due<=TODAY?"hoje":fmt(next.due)}`:"revisões feitas",t.cartoes.length?`${t.cartoes.length} ${t.cartoes.length===1?"cartão":"cartões"}`:null].filter(Boolean).join(" · "))));
  }
  const [a,b]=split(v);a.append(card);

  // Novo tema (sem sessão), com o mesmo aviso de duplicados
  const inp=el("input",{type:"text",placeholder:"nome do tema",autocomplete:"off","aria-label":"Novo tema"});
  const hint=el("div",{class:"similar",hidden:true}),sug=el("div",{class:"sugg"});
  inp.addEventListener("input",()=>{const r=suggestThemes(st,s,inp.value);
    sug.replaceChildren(...(inp.value?r.sugestoes:[]).map(t=>el("button",{type:"button",onclick:()=>{ui.tema=t.id;renderTemas()}},`Abrir «${t.nome}»`)));
    const same=findTheme(st,s,inp.value);hint.hidden=!(r.parecido||same);
    hint.textContent=same?`Já existe «${same.nome}».`:r.parecido?`Parecido com «${r.parecido.nome}». Confirma se é outro tema.`:""});
  const f=el("form",{class:"noprint"},el("label",{class:"f"},"Novo tema",inp),hint,sug,el("button",{class:"btn ghost",type:"submit"},"Criar tema"));
  f.addEventListener("submit",e=>{e.preventDefault();const n=norm(inp.value);if(!n)return;
    const ex=findTheme(st,s,n);const t=ex||ensureTheme(st,s,n,TODAY);save();ui.tema=t.id;renderTemas()});
  b.append(el("div",{class:"card"},f));
}

function themeDetail(v,t){
  const back=el("button",{class:"btn quiet",onclick:()=>{ui.tema=null;renderTemas()}},"‹ Temas de "+t.s);
  const log=themeLog(st,t);const u=lastUnderstanding(st,t);
  const steps=reviewPlan(st,t,TODAY);
  const card=el("div",{class:"card"},el("h2",{},dot(t.s),t.nome),
    el("p",{class:"s",style:"margin:-4px 0 6px;color:var(--ink-2);font-size:14px"},`${t.s} · ${log.length} ${log.length===1?"vez":"vezes"} · `,el("span",{class:"tag "+UND[u][1]},UND[u][0])),
    el("div",{class:"lbl"},"Revisões"),
    el("div",{class:"steps"},steps.map((e,i)=>{
      // Entre as revisões 1/3/7, só a primeira por fazer tem data; as seguintes dependem dela.
      const espera=e.tipo!=="antes do teste"&&steps.slice(0,i).some(x=>x.tipo!=="antes do teste"&&!x.feita);
      const hoje=!e.feita&&!espera&&e.due<=TODAY&&(!e.ate||TODAY<=e.ate);
      return el("span",{class:"step"+(e.feita?" feita":hoje?" hoje":"")},
        e.tipo==="antes do teste"?`Antes do teste ${fmt(e.teste)}`:e.tipo,": ",e.feita?`✓ ${fmt(e.feita)}`:espera?"depois":hoje?"hoje":fmt(e.due))})),
    el("div",{class:"btns"},el("button",{class:"btn sm ghost",onclick:e=>{const r=el("div",{});e.target.replaceWith(r);
      r.append(el("div",{class:"hint",style:"margin-bottom:4px"},"Como correu a revisão?"),el("div",{class:"btns"},[1,2,3].map(x=>el("button",{class:"btn sm "+(x===1?"":"ghost"),onclick:()=>{markReviewed(st,t,TODAY,x);commit();toast("Revisão registada.")}},UND[x][0]))))}},"Marcar revisão feita hoje")));
  const notes=st.sessoes.filter(x=>x.disciplina===t.s&&x.notas&&x.temas.some(n=>key(n)===key(t.nome)));
  if(notes.length)card.append(el("div",{class:"lbl"},"Dúvidas anotadas"),...notes.slice(0,4).map(x=>el("p",{style:"margin:2px 0;font-size:14px"},el("span",{class:"num muted"},fmt(x.data)+" "),x.notas)));

  // Cartões de autoteste
  const cc=el("div",{class:"card"},el("h2",{},"Cartões de autoteste",el("span",{class:"count"},t.cartoes.length)));
  if(t.cartoes.length)cc.append(el("div",{class:"btns",style:"margin-bottom:4px"},el("button",{class:"btn",onclick:()=>startTraining(t.cartoes.map(c=>[t,c]),t)},"Treinar")));
  else cc.append(el("p",{class:"muted",style:"margin:0"},"Escreve perguntas sobre este tema, com a resposta no verso. Tentar responder de memória fixa melhor a matéria do que reler."));
  for(const c of t.cartoes){
    const del=el("button",{class:"btn sm bad",onclick:()=>{if(del.dataset.arm){t.cartoes=t.cartoes.filter(x=>x.id!==c.id);commit()}else{del.dataset.arm="1";del.textContent="Confirmar"}}},"Apagar");
    cc.append(el("div",{class:"cardq"},el("div",{class:"q"},c.p),el("div",{class:"a"},c.r),
      el("div",{class:"meta"},el("span",{},c.certas+c.erradas?`${c.certas} certas · ${c.erradas} erradas${c.ultimo==="errei"?" · falhou a última":""}`:"ainda não treinado"),del)));
  }
  const fq=el("textarea",{placeholder:"Pergunta",required:true,style:"min-height:60px"}),fa=el("textarea",{placeholder:"Resposta",required:true,style:"min-height:60px"});
  const f=el("form",{style:"margin-top:12px"},el("label",{class:"f"},"Pergunta (frente)",fq),el("label",{class:"f"},"Resposta (verso)",fa),el("button",{class:"btn ghost",type:"submit"},"Adicionar cartão"));
  f.addEventListener("submit",e=>{e.preventDefault();if(!norm(fq.value)||!norm(fa.value))return;
    t.cartoes.push({id:uid(),p:fq.value.trim(),r:fa.value.trim(),certas:0,erradas:0,ultimo:null});commit();toast("Cartão adicionado.")});
  cc.append(f);

  const del=el("button",{class:"btn sm bad",onclick:()=>{
    if(del.dataset.arm){st.temas=st.temas.filter(x=>x.id!==t.id);ui.tema=null;commit();toast("Tema apagado.")}
    else{del.dataset.arm="1";del.textContent="Confirmar: apagar tema e cartões"}}},"Apagar tema");
  v.append(el("div",{},back));const [a,b]=split(v);a.append(card,el("div",{class:"btns noprint"},del));b.append(cc);
}

/* ---------- treino com cartões ---------- */
function startTraining(pairs,tema){
  const dlg=$("#treino");
  // Primeiro os falhados e os nunca treinados; depois ordem aleatória.
  const deck=pairs.slice().sort(()=>Math.random()-.5).sort((a,b)=>(b[1].ultimo==="errei")-(a[1].ultimo==="errei")||(a[1].certas+a[1].erradas)-(b[1].certas+b[1].erradas));
  let i=0,ok=0,shown=false;
  const close=()=>{dlg.close();commit()};
  function draw(){
    if(i>=deck.length){
      if(tema)markReviewed(st,tema,TODAY,ok===deck.length?1:ok>=deck.length/2?2:3);
      dlg.replaceChildren(el("div",{class:"flash"},el("h2",{id:"treino-t"},"Treino terminado"),
        el("p",{style:"margin:0;font-size:18px"},`Sabias ${ok} de ${deck.length}.`),
        el("p",{class:"muted",style:"margin:0"},ok<deck.length?"Os cartões que falhaste aparecem primeiro no próximo treino, e o tema fica marcado como confuso até acertares.":"Tudo certo."),
        el("div",{class:"btns"},el("button",{class:"btn",onclick:close},"Fechar"))));return}
    const [t,c]=deck[i];
    const face=el("div",{class:"face"},el("div",{class:"lado"},`${t.s} · ${t.nome}`),el("div",{},c.p),shown?el("div",{class:"resp"},c.r):null);
    const answer=r=>{c[r?"certas":"erradas"]++;c.ultimo=r?"acertei":"errei";if(r)ok++;i++;shown=false;save();draw()};
    dlg.replaceChildren(el("div",{class:"flash"},
      el("div",{class:"head"},el("span",{id:"treino-t"},`Cartão ${i+1} de ${deck.length}`),el("button",{class:"btn quiet sm",onclick:close},"Fechar")),
      face,
      shown?el("div",{class:"btns"},el("button",{class:"btn ghost",onclick:()=>answer(false)},"Não sabia"),el("button",{class:"btn",onclick:()=>answer(true)},"Sabia"))
        :el("div",{class:"btns"},el("button",{class:"btn",onclick:()=>{shown=true;draw()}},"Ver resposta"))));
  }
  draw();dlg.showModal();
  dlg.onclose=()=>render();
}

/* ---------- Mais: relatório e cópias ---------- */
function renderMais(){
  const v=$("#v-mais");v.replaceChildren();
  // Por defeito o mês anterior nos primeiros dias do mês, senão o mês atual.
  const d=parse(TODAY);const def=d.getDate()<=7?new Date(d.getFullYear(),d.getMonth()-1,1):d;
  if(!ui.mes)ui.mes=`${def.getFullYear()}-${String(def.getMonth()+1).padStart(2,"0")}`;
  const months=[];for(let m=new Date(2026,8,1);m<=new Date(2027,5,1);m.setMonth(m.getMonth()+1))months.push(`${m.getFullYear()}-${String(m.getMonth()+1).padStart(2,"0")}`);
  const r=monthlyReport(st,ui.mes);
  const sel=el("select",{"aria-label":"Mês",style:"width:auto"},months.map(m=>el("option",{value:m,selected:m===ui.mes},cap(monthName(m)))));
  sel.addEventListener("change",()=>{ui.mes=sel.value;renderMais()});
  const pct=r.total.planeados?Math.round(r.total.feitos/r.total.planeados*100):0;
  const rep=el("div",{class:"card"},el("h2",{},"Relatório mensal"),
    el("div",{class:"btns",style:"margin-bottom:12px"},sel),
    el("div",{class:"kpis"},el("div",{},el("b",{},hm(r.total.feitos)),el("span",{},"estudados")),
      el("div",{},el("b",{},hm(r.total.planeados)),el("span",{},"planeados")),el("div",{},el("b",{},`${pct}%`),el("span",{},"do plano"))),
    el("table",{class:"rep"},el("thead",{},el("tr",{},el("th",{},"Disciplina"),el("th",{style:"text-align:right"},"Min."),el("th",{style:"text-align:right"},"Plano"),el("th",{},""))),
      el("tbody",{},r.linhas.filter(l=>l.feitos||l.planeados).map(l=>el("tr",{},el("td",{},dot(l.s)," ",l.s),el("td",{class:"n"},l.feitos),el("td",{class:"n muted"},l.planeados),
        el("td",{},el("div",{class:"bar"},el("i",{style:`width:${l.planeados?Math.min(100,l.feitos/l.planeados*100):l.feitos?100:0}%`})))))) ),
    el("div",{class:"lbl"},"Temas ainda confusos"),
    r.confusos.length?el("div",{},r.confusos.map(c=>el("div",{class:"row"},dot(c.s),el("div",{class:"grow"},el("div",{class:"t"},c.nome),el("div",{class:"s"},`${c.s} · última vez ${fmt(c.ultima)}${c.cartoesErrados?` · ${c.cartoesErrados} ${c.cartoesErrados===1?"cartão falhado":"cartões falhados"}`:""}`))))):el("p",{class:"muted",style:"margin:0"},"Nenhum."),
    el("div",{class:"lbl"},`Testes em ${monthName(r.proximo)}`),
    r.testes.length?el("div",{},r.testes.map(t=>el("div",{class:"row"},dot(t.s),el("div",{class:"grow t"},t.s),el("span",{class:"num muted"},`${fmtShort(t.d)} ${t.h}`)))):el("p",{class:"muted",style:"margin:0"},"Nenhum."),
    el("div",{class:"btns noprint",style:"margin-top:14px"},
      el("button",{class:"btn",onclick:async()=>{const text=reportText(r);
        if(navigator.share){try{await navigator.share({title:`Relatório de estudo · ${monthName(r.ym)}`,text});return}catch(e){if(e.name==="AbortError")return}}
        try{await navigator.clipboard.writeText(text);toast("Relatório copiado. Cola-o numa mensagem.")}catch{toast("Não foi possível partilhar.")}}},"Enviar relatório"),
      el("button",{class:"btn ghost",onclick:()=>window.print()},"Imprimir")));
  const [a,b]=split(v);a.append(rep);

  // Cópia de segurança
  const age=st.ultimaCopia?`Última cópia: ${fmt(st.ultimaCopia.slice(0,10))}.`:"Ainda não fizeste nenhuma cópia.";
  const file=el("input",{type:"file",accept:"application/json,.json",hidden:true});
  file.addEventListener("change",async()=>{
    const f=file.files[0];if(!f)return;
    try{const o=JSON.parse(await f.text());const err=validateBackup(o);if(err){toast(err);return}
      if(!confirm(`Substituir os dados deste aparelho pela cópia (${o.sessoes.length} sessões, ${o.temas.length} temas)?`))return;
      st=o;commit();toast("Cópia reposta.")}catch{toast("Não foi possível ler o ficheiro.")}
    finally{file.value=""}
  });
  b.append(el("div",{class:"card noprint"},el("h2",{},"Cópia de segurança"),
    el("p",{style:"margin:0 0 10px;font-size:14.5px;color:var(--ink-2)"},"Os dados ficam só neste aparelho, dentro do navegador. Guarda uma cópia de vez em quando (por exemplo no OneDrive, no iCloud Drive ou no Google Drive) para não os perderes se mudares de computador ou limpares os dados do navegador. ",el("b",{},age)),
    el("div",{class:"btns"},el("button",{class:"btn",onclick:exportBackup},"Guardar cópia"),el("button",{class:"btn ghost",onclick:()=>file.click()},"Repor a partir de cópia"),file)));

  b.append(el("div",{class:"card noprint"},el("h2",{},"Instalar a app"),
    el("ul",{style:"margin:0;padding-left:18px;font-size:14.5px;color:var(--ink-2);display:grid;gap:4px"},
      el("li",{},el("b",{},"Portátil (Chrome ou Edge): "),"clica no ícone de instalar, à direita da barra de endereço."),
      el("li",{},el("b",{},"Mac com Safari: "),"menu Ficheiro › «Adicionar ao Dock»."),
      el("li",{},el("b",{},"iPhone: "),"no Safari, Partilhar › «Adicionar ao ecrã principal»."),
      el("li",{},el("b",{},"Android: "),"no Chrome, menu ⋮ › «Instalar app».")),
    el("p",{style:"margin:8px 0 0;font-size:14.5px;color:var(--ink-2)"},"Depois de instalada funciona sem internet. Os dados ficam no aparelho onde a usas.")));
}
async function exportBackup(){
  const prev=st.ultimaCopia;st.ultimaCopia=new Date().toISOString();
  const name=`caderno-copia-${TODAY}.json`;
  const blob=new Blob([JSON.stringify(st,null,1)],{type:"application/json"});
  const f=new File([blob],name,{type:"application/json"});
  try{
    if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:"Cópia do caderno"})}
    else{const a=el("a",{href:URL.createObjectURL(blob),download:name});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000)}
    commit();toast("Cópia criada.");
  }catch(e){st.ultimaCopia=prev;if(e.name!=="AbortError")toast("Não foi possível criar a cópia.")}
}

/* ---------- arranque ---------- */
st=load();save();
navigator.storage?.persist?.().catch(()=>{});
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"){const n=iso(new Date());if(n!==TODAY){TODAY=n;ui.sel=n;render()}}});
render();
if("serviceWorker" in navigator&&location.protocol!=="file:")navigator.serviceWorker.register("sw.js").catch(()=>{});
