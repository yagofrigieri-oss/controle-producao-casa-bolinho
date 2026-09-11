"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Product = { id:number; nome:string; unidades_por_pacote:number; ativo:boolean };
type Employee = { id:number; nome:string; setor:string; ativo:boolean };
type Order = { id:number; produto_id:number; quantidade_programada:number; observacao:string|null; status:string; criado_em:string };
type Prod = { ordem_id:number; quantidade_produzida:number; funcionario_id:number|null; registrado_em:string };
type Pack = { ordem_id:number; quantidade_pacotes:number; unidades_por_pacote:number; quantidade_empacotada:number; funcionario_id:number|null; registrado_em:string };

const sb = supabase();

export default function Home(){
  const [session,setSession] = useState<any>(null);
  const [me,setMe] = useState<Employee|null>(null);
  const [tab,setTab] = useState("dashboard");
  const [products,setProducts] = useState<Product[]>([]);
  const [employees,setEmployees] = useState<Employee[]>([]);
  const [orders,setOrders] = useState<Order[]>([]);
  const [prods,setProds] = useState<Prod[]>([]);
  const [packs,setPacks] = useState<Pack[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");

  async function load(){
    setError("");
    const {data:{session}} = await sb.auth.getSession();
    setSession(session);
    if(!session){setLoading(false);return}
    const {data: emp} = await sb.from("funcionarios").select("*").eq("auth_user_id",session.user.id).eq("ativo",true).maybeSingle();
    setMe(emp);
    const [p,e,o,pr,pa] = await Promise.all([
      sb.from("produtos").select("*").eq("ativo",true).order("nome"),
      sb.from("funcionarios").select("*").eq("ativo",true).order("nome"),
      sb.from("ordens_producao").select("*").order("criado_em",{ascending:false}),
      sb.from("registros_producao").select("*").order("registrado_em",{ascending:false}),
      sb.from("registros_empacotamento").select("*").order("registrado_em",{ascending:false})
    ]);
    setProducts(p.data||[]); setEmployees(e.data||[]); setOrders(o.data||[]);
    setProds(pr.data||[]); setPacks(pa.data||[]);
    setLoading(false);
  }

  useEffect(()=>{load(); const {data}=sb.auth.onAuthStateChange(()=>load()); return ()=>data.subscription.unsubscribe()},[]);

  if(loading) return <div className="login"><div>Carregando sistema...</div></div>;
  if(!session) return <Login onLogin={load}/>;

  const role=me?.setor || "ADMINISTRACAO";
  const allowed = (t:string) => role==="ADMINISTRACAO" || (role==="PRODUCAO" && ["dashboard","producao","historico"].includes(t)) || (role==="EMPACOTAMENTO" && ["dashboard","empacotamento","historico"].includes(t));

  return <div>
    <header className="top"><div className="topin">
      <div className="brand">Casa do Bolinho de Frango<small>Controle de Produção • {me?.nome} • {role}</small></div>
      <div className="nav">
        {allowed("dashboard")&&<button className={tab==="dashboard"?"active":""} onClick={()=>setTab("dashboard")}>Dashboard</button>}
        {allowed("nova")&&<button className={tab==="nova"?"active":""} onClick={()=>setTab("nova")}>Nova ordem</button>}
        {allowed("producao")&&<button className={tab==="producao"?"active":""} onClick={()=>setTab("producao")}>Produção</button>}
        {allowed("empacotamento")&&<button className={tab==="empacotamento"?"active":""} onClick={()=>setTab("empacotamento")}>Empacotamento</button>}
        {allowed("historico")&&<button className={tab==="historico"?"active":""} onClick={()=>setTab("historico")}>Histórico</button>}
        <button onClick={async()=>{await sb.auth.signOut();location.reload()}}>Sair</button>
      </div>
    </div></header>
    <main className="wrap">
      {error&&<div className="error section">{error}</div>}
      {tab==="dashboard"&&<Dashboard orders={orders} products={products} prods={prods} packs={packs}/>}
      {tab==="nova"&&<NewOrder products={products} onDone={load}/>}
      {tab==="producao"&&<Production orders={orders} products={products} me={me} prods={prods} onDone={load}/>}
      {tab==="empacotamento"&&<Packaging orders={orders} products={products} me={me} prods={prods} packs={packs} onDone={load}/>}
      {tab==="historico"&&<History orders={orders} products={products} prods={prods} packs={packs}/>}
    </main>
  </div>
}

function Login({onLogin}:{onLogin:()=>void}){
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [err,setErr]=useState(""); const [busy,setBusy]=useState(false);
  async function go(e:any){e.preventDefault();setBusy(true);setErr("");const {error}=await sb.auth.signInWithPassword({email,password});if(error)setErr("E-mail ou senha inválidos.");else onLogin();setBusy(false)}
  return <div className="login"><div className="loginbox">
    <h1>Controle de Produção</h1><p className="muted">Casa do Bolinho de Frango</p>
    <form className="form" onSubmit={go}>
      <div className="field"><label>E-mail</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></div>
      <div className="field"><label>Senha</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required /></div>
      {err&&<div className="error">{err}</div>}<button className="btn primary" disabled={busy}>{busy?"Entrando...":"Entrar"}</button>
    </form>
  </div></div>
}

function Dashboard({orders,products,prods,packs}:{orders:Order[],products:Product[],prods:Prod[],packs:Pack[]}){
  const stats=useMemo(()=>orders.map(o=>{
    const produced=prods.filter(x=>x.ordem_id===o.id).reduce((s,x)=>s+x.quantidade_produzida,0);
    const packed=packs.filter(x=>x.ordem_id===o.id).reduce((s,x)=>s+x.quantidade_empacotada,0);
    return {...o,produced,packed};
  }),[orders,prods,packs]);
  const abertas=stats.filter(x=>x.produced===0).length;
  const prod=stats.filter(x=>x.produced>0&&x.packed<x.produced).length;
  const div=stats.filter(x=>x.packed>x.produced||x.produced>x.quantidade_programada).length;
  const concl=stats.filter(x=>x.packed>=x.quantidade_programada&&x.quantidade_programada>0).length;
  return <><h2>Dashboard</h2><div className="grid">
    <div className="card"><div className="muted">Ordens abertas</div><div className="kpi">{abertas}</div></div>
    <div className="card"><div className="muted">Em produção</div><div className="kpi">{prod}</div></div>
    <div className="card"><div className="muted">Divergências</div><div className="kpi">{div}</div></div>
    <div className="card"><div className="muted">Concluídas</div><div className="kpi">{concl}</div></div>
  </div><div className="card section"><h3>Ordens recentes</h3><OrderTable stats={stats} products={products}/></div></>
}

function NewOrder({products,onDone}:{products:Product[],onDone:()=>void}){
  const [product,setProduct]=useState(products[0]?.id||0); const [qty,setQty]=useState(""); const [obs,setObs]=useState(""); const [msg,setMsg]=useState(""); const [busy,setBusy]=useState(false);
  async function save(e:any){e.preventDefault();setBusy(true);setMsg("");const {error}=await sb.from("ordens_producao").insert({produto_id:product,quantidade_programada:Number(qty),observacao:obs||null,status:"ABERTA"});if(error)setMsg(error.message);else{setMsg("Ordem criada com sucesso.");setQty("");setObs("");onDone()}setBusy(false)}
  return <div className="card"><h2>Nova ordem de produção</h2><form className="form" onSubmit={save}>
    <div className="field"><label>Produto</label><select value={product} onChange={e=>setProduct(Number(e.target.value))}>{products.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
    <div className="field"><label>Quantidade programada (unidades)</label><input type="number" min="1" value={qty} onChange={e=>setQty(e.target.value)} required /></div>
    <div className="field"><label>Observação</label><textarea value={obs} onChange={e=>setObs(e.target.value)} placeholder="Opcional"/></div>
    {msg&&<div className="success">{msg}</div>}<button className="btn primary" disabled={busy}>{busy?"Salvando...":"Criar ordem"}</button>
  </form></div>
}

function Production({orders,products,me,prods,onDone}:{orders:Order[],products:Product[],me:Employee|null,prods:Prod[],onDone:()=>void}){
  const active=orders.filter(o=>o.status!=="CANCELADA"); const [order,setOrder]=useState(active[0]?.id||0); const [qty,setQty]=useState(""); const [obs,setObs]=useState(""); const [msg,setMsg]=useState("");
  async function save(e:any){e.preventDefault();setMsg("");const {error}=await sb.from("registros_producao").insert({ordem_id:order,funcionario_id:me?.id,quantidade_produzida:Number(qty),observacao:obs||null});if(error)setMsg(error.message);else{setMsg("Produção registrada.");setQty("");setObs("");onDone()}}
  return <div className="card"><h2>Registrar produção</h2><p className="muted">Informe a quantidade realmente produzida.</p><form className="form" onSubmit={save}>
    <div className="field"><label>Ordem</label><select value={order} onChange={e=>setOrder(Number(e.target.value))}>{active.map(o=><option key={o.id} value={o.id}>#{o.id} — {products.find(p=>p.id===o.produto_id)?.nome} — programado {o.quantidade_programada}</option>)}</select></div>
    <div className="field"><label>Quantidade produzida</label><input type="number" min="0" value={qty} onChange={e=>setQty(e.target.value)} required /></div>
    <div className="field"><label>Observação / motivo de diferença</label><textarea value={obs} onChange={e=>setObs(e.target.value)} placeholder="Ex.: perda de produção, produto danificado, sobra, falta..." /></div>
    {msg&&<div className="success">{msg}</div>}<button className="btn primary">Registrar produção</button>
  </form><div className="section"><h3>Últimos registros</h3>{prods.slice(0,8).map((p,i)=><div key={i} className="row" style={{padding:"8px 0",borderBottom:"1px solid #eee"}}><b>#{p.ordem_id}</b><span>{p.quantidade_produzida} unidades</span><span className="muted">{new Date(p.registrado_em).toLocaleString("pt-BR")}</span></div>)}</div></div>
}

function Packaging({orders,products,me,prods,packs,onDone}:{orders:Order[],products:Product[],me:Employee|null,prods:Prod[],packs:Pack[],onDone:()=>void}){
  const [order,setOrder]=useState(orders[0]?.id||0); const [packages,setPackages]=useState(""); const [obs,setObs]=useState(""); const [msg,setMsg]=useState("");
  const produced=prods.filter(x=>x.ordem_id===order).reduce((s,x)=>s+x.quantidade_produzida,0);
  const packed=packs.filter(x=>x.ordem_id===order).reduce((s,x)=>s+x.quantidade_empacotada,0);
  const o=orders.find(x=>x.id===order); const units=Number(packages||0)*100;
  async function save(e:any){e.preventDefault();setMsg("");const {error}=await sb.from("registros_empacotamento").insert({ordem_id:order,funcionario_id:me?.id,quantidade_pacotes:Number(packages),unidades_por_pacote:100,observacao:obs||null});if(error)setMsg(error.message);else{setMsg("Empacotamento registrado.");setPackages("");setObs("");onDone()}}
  return <div className="card"><h2>Empacotamento</h2><p className="muted">Regra atual: <b>1 pacote = 100 unidades</b>.</p><form className="form" onSubmit={save}>
    <div className="field"><label>Ordem</label><select value={order} onChange={e=>setOrder(Number(e.target.value))}>{orders.map(x=><option key={x.id} value={x.id}>#{x.id} — {products.find(p=>p.id===x.produto_id)?.nome} — programado {x.quantidade_programada}</option>)}</select></div>
    <div className="card"><div className="row"><span>Programado: <b>{o?.quantidade_programada||0}</b></span><span>Produzido: <b>{produced}</b></span><span>Já empacotado: <b>{packed}</b></span></div><div className="section">Este lançamento: <b>{units}</b> unidades</div></div>
    <div className="field"><label>Quantidade de pacotes</label><input type="number" min="0" value={packages} onChange={e=>setPackages(e.target.value)} required /></div>
    <div className="field"><label>Observação / divergência</label><textarea value={obs} onChange={e=>setObs(e.target.value)} placeholder="Ex.: falta, sobra, perda, contagem..." /></div>
    {msg&&<div className="success">{msg}</div>}<button className="btn primary">Registrar empacotamento</button>
  </form></div>
}

function History({orders,products,prods,packs}:{orders:Order[],products:Product[],prods:Prod[],packs:Pack[]}){
  const rows=orders.map(o=>{const produced=prods.filter(x=>x.ordem_id===o.id).reduce((s,x)=>s+x.quantidade_produzida,0);const packed=packs.filter(x=>x.ordem_id===o.id).reduce((s,x)=>s+x.quantidade_empacotada,0);return {...o,produced,packed}}); 
  return <div className="card"><h2>Histórico</h2><p className="muted">Registro consolidado das ordens e quantidades.</p><OrderTable stats={rows} products={products}/></div>
}

function OrderTable({stats,products}:{stats:any[],products:Product[]}){
  if(!stats.length)return <div className="empty">Nenhuma ordem registrada.</div>;
  return <table className="table"><thead><tr><th>Ordem</th><th>Produto</th><th>Programado</th><th>Produzido</th><th>Empacotado</th><th>Situação</th></tr></thead><tbody>
    {stats.map(x=>{const d=x.packed>x.produced||x.produced>x.quantidade_programada;const done=x.packed>=x.quantidade_programada&&x.quantidade_programada>0;return <tr key={x.id}><td>#{x.id}</td><td>{products.find(p=>p.id===x.produto_id)?.nome||"—"}</td><td>{x.quantidade_programada}</td><td>{x.produced}</td><td>{x.packed}</td><td><span className={"pill "+(d?"bad":done?"ok":"warn")}>{d?"Divergência":done?"Concluída":"Em andamento"}</span></td></tr>})}
  </tbody></table>
}
