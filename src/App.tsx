import { useEffect, useMemo, useState } from 'react';
import {
  Bell, BookOpen, Cake, CalendarDays, ClipboardCheck, Heart, History,
  Menu, Moon, PartyPopper, Pencil, Plus, Save, Settings, Sun, Trash2,
  UserCog, Users, X
} from 'lucide-react';
import { supabase } from './supabase';

const ADMIN_EMAIL='andreytrindadedossantos@gmail.com';
const months=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const celebrationCards=[['Março','Dia da Mulher'],['Abril','Páscoa'],['Maio','Dia das Mães'],['Agosto','Dia dos Pais'],['Outubro','Dia das Crianças'],['Dezembro','Natal']];

type Student={id:string;name:string;birth:string;group:string;guardian:string;phone:string;notes:string;ageInfo:string};
type UserRec={id:string;name:string;email:string;phone:string;role:string;group:string;status:string};
type Mother={id:string;name:string;phone:string;email:string;notes:string;active:boolean;birth:string;ageInfo:string};
type Schedule={id:string;date:string;adolescentTeacher:string;youngerTeacher:string;cleaningHelper:string;topic:string;replacementReason:string};
type Attendance={id:string;date:string;teacher:string;group:string;entries:{studentId:string;name:string;present:boolean}[]};
type EventItem={id:string;title:string;date:string;type:string;time:string;notes:string};
type Meeting={id:string;title:string;date:string;time:string;location:string;notes:string};
type Response={id:string;meetingId:string;userId:string;userName:string;status:'yes'|'no'};
type Notice={id:string;title:string;body:string;date:string;kind:string;meetingId?:string};
type AuditLog={
 id:string;action:'insert'|'update'|'delete';entityType:string;entityName:string;recordId:string;
 actorName:string;actorEmail:string;createdAt:string;beforeData:any;afterData:any
};
type Data={students:Student[];users:UserRec[];mothers:Mother[];schedules:Schedule[];attendance:Attendance[];events:EventItem[];meetings:Meeting[];responses:Response[];notifications:Notice[];settings:{name:string;subtitle:string}};

const fmt=(d:string)=>d&&d.length>=10?d.slice(0,10).split('-').reverse().join('/'):'';
const dateOnly=(d:any)=>d?String(d).slice(0,10):'';
const formatMobileTime=(value:string)=>{const digits=value.replace(/\D/g,'').slice(0,4);if(digits.length<=2)return digits;return digits.slice(0,2)+':'+digits.slice(2)};
const validMobileTime=(value:string)=>!value||/^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const empty:Data={students:[],users:[],mothers:[],schedules:[],attendance:[],events:[],meetings:[],responses:[],notifications:[],settings:{name:'Evangelização Infanto Juvenil',subtitle:'Gestão e Coordenação'}};

async function loadAll():Promise<Data>{
  const [s,u,m,sc,a,e,me,r,n,se]=await Promise.all([
    supabase.from('sabado_students').select('*').order('name'),
    supabase.from('sabado_users').select('*').order('name'),
    supabase.from('sabado_mothers').select('*').order('name'),
    supabase.from('sabado_schedules').select('*').order('date'),
    supabase.from('sabado_attendance').select('*').order('date',{ascending:false}),
    supabase.from('sabado_events').select('*').order('date'),
    supabase.from('sabado_meetings').select('*').order('date'),
    supabase.from('sabado_meeting_responses').select('*'),
    supabase.from('sabado_notifications').select('*').order('date',{ascending:false}),
    supabase.from('sabado_settings').select('*').eq('id',1).maybeSingle()
  ]);
  const err=[s.error,u.error,m.error,sc.error,a.error,e.error,me.error,r.error,n.error,se.error].find(Boolean);
  if(err) throw err;
  return {
    students:(s.data||[]).map((x:any)=>({id:x.id,name:x.name,birth:dateOnly(x.birth),group:x.group_name||'A definir',guardian:x.guardian||'',phone:x.phone||'',notes:x.notes||'',ageInfo:x.age_info||''})),
    users:(u.data||[]).map((x:any)=>({id:x.id,name:x.name,email:x.email||'',phone:x.phone||'',role:x.role||'Professor',group:x.group_name||'Geral',status:x.status||'Ativo'})),
    mothers:(m.data||[]).map((x:any)=>({id:x.id,name:x.name,phone:x.phone||'',email:x.email||'',notes:x.notes||'',active:x.active!==false,birth:dateOnly(x.birth),ageInfo:x.age_info||''})),
    schedules:(sc.data||[]).map((x:any)=>({id:x.id,date:dateOnly(x.date),adolescentTeacher:x.adolescent_teacher||'',youngerTeacher:x.younger_teacher||'',cleaningHelper:x.cleaning_helper||'',topic:x.topic||'',replacementReason:x.replacement_reason||''})),
    attendance:(a.data||[]).map((x:any)=>({id:x.id,date:dateOnly(x.date),teacher:x.teacher,group:x.group_name,entries:Array.isArray(x.entries)?x.entries:[]})),
    events:(e.data||[]).map((x:any)=>({id:x.id,title:x.title,date:dateOnly(x.date),type:x.type,time:x.time?String(x.time).slice(0,5):'',notes:x.notes||''})),
    meetings:(me.data||[]).map((x:any)=>({id:x.id,title:x.title,date:dateOnly(x.date),time:x.time?String(x.time).slice(0,5):'',location:x.location||'',notes:x.notes||''})),
    responses:(r.data||[]).map((x:any)=>({id:x.id,meetingId:x.meeting_id,userId:x.user_id,userName:x.user_name,status:x.status})),
    notifications:(n.data||[]).map((x:any)=>({id:x.id,title:x.title,body:x.body,date:x.date,kind:x.kind,meetingId:x.meeting_id||undefined})),
    settings:se.data?{name:se.data.name,subtitle:se.data.subtitle}:empty.settings
  };
}

function App(){
  const [data,setData]=useState<Data>(empty),[loading,setLoading]=useState(true),[page,setPage]=useState('home'),[menu,setMenu]=useState(false),[dark,setDark]=useState(()=>localStorage.getItem('theme')==='dark'),[msg,setMsg]=useState(''),[now,setNow]=useState(new Date()),[admin,setAdmin]=useState(false),[noticeOpen,setNoticeOpen]=useState(false),[meetingNotice,setMeetingNotice]=useState<Meeting|null>(null),[rsvpUserId,setRsvpUserId]=useState('');
  const [read,setRead]=useState<string[]>(()=>{try{return JSON.parse(localStorage.getItem('readNotices')||'[]')}catch{return[]}}),
        [hiddenNotices,setHiddenNotices]=useState<string[]>(()=>{try{return JSON.parse(localStorage.getItem('hiddenNotices')||'[]')}catch{return[]}});
  const reload=async()=>{try{setData(await loadAll())}catch(e:any){setMsg(e.message||'Erro ao carregar dados.')}finally{setLoading(false)}};
  useEffect(()=>{reload();supabase.auth.getUser().then(({data})=>setAdmin(data.user?.email?.toLowerCase()===ADMIN_EMAIL));const t=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(t)},[]);
  useEffect(()=>{document.documentElement.classList.toggle('dark',dark);document.documentElement.setAttribute('data-theme',dark?'dark':'light');document.documentElement.style.colorScheme=dark?'dark':'light';localStorage.setItem('theme',dark?'dark':'light')},[dark]);
  useEffect(()=>{
    const channel=supabase.channel('sabado-notifications-live').on('postgres_changes',{event:'INSERT',schema:'public',table:'sabado_notifications'},payload=>{
      const n=payload.new as any;
      setData(prev=>({...prev,notifications:[{id:n.id,title:n.title,body:n.body,date:n.date,kind:n.kind,meetingId:n.meeting_id||undefined},...prev.notifications.filter(x=>x.id!==n.id)]}));
      if('Notification' in window && Notification.permission==='granted'){
        try{new Notification(n.title,{body:n.body})}catch{}
      }
    }).subscribe();
    return()=>{supabase.removeChannel(channel)}
  },[]);
  useEffect(()=>{if(!msg)return;const t=setTimeout(()=>setMsg(''),2500);return()=>clearTimeout(t)},[msg]);

  if(window.location.pathname==='/admin'&&!admin)return <AdminLogin onSuccess={()=>{setAdmin(true);window.history.replaceState({},'', '/');reload()}}/>;
  if(loading)return <div className="loading">Carregando Evangelização Infanto Juvenil...</div>;

  const nav=[['Painel','home',Users],['Alunos','students',Users],['Mães','mothers',Heart],['Escalas','schedules',BookOpen],['Reuniões','meetings',CalendarDays],['Chamada','attendance',ClipboardCheck],['Histórico de Aulas','history',History],['Professores','users',UserCog],['Aniversariantes do Mês','birthdays',Cake],['Calendário','calendar',CalendarDays],['Datas Comemorativas','celebrations',PartyPopper]] as const;
  const extra=admin?[['Auditoria','audit',History],['Configurações','settings',Settings],['Administração','admin',UserCog]] as const:[];
  const visibleNotifications=data.notifications.filter(n=>!hiddenNotices.includes(n.id));
  const unread=visibleNotifications.filter(n=>!read.includes(n.id)).length;
  const toast=(s:string)=>setMsg(s);
  const enableDeviceNotifications=async()=>{
    if(!('Notification' in window))return toast('Este navegador não oferece notificações do dispositivo.');
    const permission=await Notification.requestPermission();
    toast(permission==='granted'?'Notificações do dispositivo ativadas.':'Permissão de notificações não concedida.');
  };
  const deleteNotice=(id:string)=>{
    const next=[...new Set([...hiddenNotices,id])];
    setHiddenNotices(next);
    localStorage.setItem('hiddenNotices',JSON.stringify(next));
    toast('Notificação removida para este usuário.');
  };
  const clearNotices=()=>{
    if(!visibleNotifications.length||!confirm('Remover todas as notificações da sua tela?'))return;
    const next=[...new Set([...hiddenNotices,...visibleNotifications.map(n=>n.id)])];
    setHiddenNotices(next);
    localStorage.setItem('hiddenNotices',JSON.stringify(next));
    toast('Notificações removidas para este usuário.');
  };

  const respond=async(status:'yes'|'no')=>{
    if(!meetingNotice||!rsvpUserId)return toast('Selecione seu nome.');
    const u=data.users.find(x=>x.id===rsvpUserId); if(!u)return;
    const old=data.responses.find(x=>x.meetingId===meetingNotice.id&&x.userId===u.id);
    const payload={meeting_id:meetingNotice.id,user_id:u.id,user_name:u.name,status,updated_at:new Date().toISOString()};
    const q=old?supabase.from('sabado_meeting_responses').update(payload).eq('id',old.id):supabase.from('sabado_meeting_responses').insert(payload);
    const {error}=await q;if(error)return toast(error.message);
    setMeetingNotice(null);setRsvpUserId('');await reload();toast(status==='yes'?'Participação confirmada.':'Ausência informada.');
  };

  const content=page==='home'?<Dashboard data={data}/>:page==='students'?<Students data={data} admin={admin} reload={reload} toast={toast}/>:page==='mothers'?<Mothers data={data} admin={admin} reload={reload} toast={toast}/>:page==='schedules'?<Schedules data={data} admin={admin} reload={reload} toast={toast}/>:page==='meetings'?<Meetings data={data} admin={admin} reload={reload} toast={toast} setMeeting={setMeetingNotice}/>:page==='attendance'?<AttendancePage data={data} admin={admin} reload={reload} toast={toast}/>:page==='history'?<HistoryPage data={data} admin={admin} reload={reload} toast={toast}/>:page==='birthdays'?<Birthdays data={data}/>:page==='calendar'?<Calendar data={data} admin={admin} reload={reload} toast={toast}/>:page==='celebrations'?<Celebrations data={data} admin={admin} reload={reload} toast={toast}/>:page==='users'?<UsersPage data={data} admin={admin} reload={reload} toast={toast}/>:page==='audit'&&admin?<AuditPage/>:page==='settings'&&admin?<SettingsPage data={data} reload={reload} toast={toast}/>:page==='admin'&&admin?<AdminPage data={data} setPage={setPage}/>:<Dashboard data={data}/>;

  return <div className="shell"><aside className={menu?'side open':'side'}><div className="brand"><div className="brand-logo"><BookOpen size={26}/><span className="brand-heart">♥</span></div><div className="brand-copy"><b className="brand-title"><span>Evangelização</span><span>Infanto Juvenil</span></b><span>Gestão e Coordenação</span></div></div><button className="close" onClick={()=>setMenu(false)}><X/></button>{[...nav,...extra].map(([label,key,I])=><button key={key} className={page===key?'nav active':'nav'} onClick={()=>{setPage(key);setMenu(false)}}><I size={18}/>{label}</button>)}</aside><main><header><button className="hamb" onClick={()=>setMenu(true)}><Menu/></button><div className="clock"><b>{now.toLocaleTimeString('pt-BR')}</b><span>{now.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}</span></div><div className="top"><button className="top-icon-btn theme-toggle" title={dark?'Usar tema claro':'Usar tema cinza escuro'} onClick={()=>setDark(!dark)}>{dark?<Sun/>:<Moon/>}</button><button className="notice-button top-icon-btn" title="Notificações" onClick={()=>setNoticeOpen(!noticeOpen)}><Bell/>{unread>0&&<span className="badge">{unread}</span>}</button>{admin&&<button className="ghost-btn" onClick={async()=>{await supabase.auth.signOut();setAdmin(false);setPage('home')}}>Sair</button>}</div></header>
  {noticeOpen&&<div className="notice-panel"><div className="notice-head"><b>Notificações</b><div className="notice-tools"><button className="read-all" onClick={()=>{const ids=visibleNotifications.map(n=>n.id);const next=[...new Set([...read,...ids])];setRead(next);localStorage.setItem('readNotices',JSON.stringify(next))}}>✓ Marcar todas como lidas</button><button className="read-all" onClick={enableDeviceNotifications}>🔔 Ativar no dispositivo</button>{visibleNotifications.length>0&&<button className="delete-notifications-btn" onClick={clearNotices}><Trash2 size={15}/> Excluir notificações</button>}<button className="icon-close" onClick={()=>setNoticeOpen(false)}><X size={18}/></button></div></div>{visibleNotifications.map(n=><div className={read.includes(n.id)?'notice-item read':'notice-item'} key={n.id}><div className="notice-item-head"><b>{n.title}</b><button className="notice-delete" title="Excluir esta notificação" onClick={()=>deleteNotice(n.id)}><Trash2 size={15}/></button></div><span>{n.body}</span><small>{new Date(n.date).toLocaleString('pt-BR')}</small>{n.kind==='meeting'&&n.meetingId&&<button className="notice-action" onClick={()=>{const m=data.meetings.find(x=>x.id===n.meetingId);if(m){setMeetingNotice(m);setNoticeOpen(false)}}}>Responder à reunião</button>}</div>)}{!visibleNotifications.length&&<Empty text="Nenhuma notificação ainda."/>}</div>}
  {meetingNotice&&<Modal title="Confirmar participação" close={()=>setMeetingNotice(null)}><label>Seu nome</label><select value={rsvpUserId} onChange={e=>setRsvpUserId(e.target.value)}><option value="">Selecione seu nome</option>{data.users.filter(u=>['Professor','Administrador'].includes(u.role)&&u.status!=='Inativo').sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')).map(u=><option value={u.id} key={u.id}>{u.name}</option>)}</select><div className="rsvp-buttons"><button className="yes-rsvp" disabled={!rsvpUserId} onClick={()=>respond('yes')}>✅ Vou participar</button><button className="no-rsvp" disabled={!rsvpUserId} onClick={()=>respond('no')}>❌ Não poderei participar</button></div></Modal>}
  {msg&&<div className="toast">{msg}</div>}<section className="content">{content}</section><footer>© 2026 Evangelização Infanto Juvenil · Todos os direitos reservados.</footer></main></div>
}

function AdminLogin({onSuccess}:{onSuccess:()=>void}){const[email,setEmail]=useState(ADMIN_EMAIL),[password,setPassword]=useState(''),[mode,setMode]=useState<'login'|'signup'>('login'),[msg,setMsg]=useState('');const go=async()=>{if(email.toLowerCase()!==ADMIN_EMAIL)return setMsg('Acesso exclusivo do administrador.');const r=mode==='login'?await supabase.auth.signInWithPassword({email,password}):await supabase.auth.signUp({email,password});if(r.error)return setMsg(r.error.message);if(!r.data.session)return setMsg('Confira seu e-mail para confirmar a conta.');onSuccess()};return <div className="login-page"><div className="login-card"><h1>Acesso administrativo</h1><input value={email} onChange={e=>setEmail(e.target.value)} type="email"/><input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Senha"/><button className="primary" onClick={go}>{mode==='login'?'Entrar':'Criar acesso'}</button><button className="link-btn" onClick={()=>setMode(mode==='login'?'signup':'login')}>{mode==='login'?'Primeiro acesso? Criar senha':'Já tenho acesso'}</button>{msg&&<small>{msg}</small>}</div></div>}

function Dashboard({data}:{data:Data}){
  const currentYear=new Date().getFullYear(),today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});
  const[year,setYear]=useState(currentYear);
  const pres=data.attendance.reduce((s,a)=>s+a.entries.filter(e=>e.present).length,0);
  const monthNames=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const monthly=monthNames.map((label,i)=>({label,present:data.attendance.filter(a=>Number(a.date.slice(0,4))===currentYear&&Number(a.date.slice(5,7))===i+1).reduce((s,a)=>s+a.entries.filter(e=>e.present).length,0)}));
  const maxMonthly=Math.max(1,...monthly.map(m=>m.present));
  const groups={menores:data.students.filter(s=>s.group==='Menores').length,adolescentes:data.students.filter(s=>s.group==='Adolescentes').length,definir:data.students.filter(s=>!s.group||s.group==='A definir').length};
  const total=Math.max(1,data.students.length), menorPct=Math.round(groups.menores/total*100), adPct=Math.round(groups.adolescentes/total*100);
  const yearly:Record<string,number>={};
  data.attendance.filter(a=>Number(a.date.slice(0,4))===currentYear).forEach(a=>a.entries.forEach(e=>{if(e.present)yearly[e.studentId]=(yearly[e.studentId]||0)+1}));
  const ranking=data.students.map(s=>({name:s.name,count:yearly[s.id]||0})).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'pt-BR')).slice(0,5);
  const rankMax=Math.max(1,...ranking.map(r=>r.count));
  const iso=(y:number,m:number,d:number)=>`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const lastSat=(y:number,m:number)=>{const dt=new Date(Date.UTC(y,m,0));return iso(y,m,dt.getUTCDate()-((dt.getUTCDay()-6+7)%7))};
  const years=[...new Set([currentYear,currentYear+1,currentYear+2,currentYear+3,currentYear+4,...data.events.map(e=>Number(e.date.slice(0,4)))])].filter(y=>y>=currentYear).sort();
  const items:any[]=data.events.map(e=>({key:e.id,title:e.type==='Festa'?'🎉 '+e.title:e.title,date:e.date,type:e.type==='Festa'?'Data comemorativa':e.type,detail:e.notes,time:e.time}));
  for(const y of years)for(let m=1;m<=12;m++){const names=data.students.filter(s=>s.birth&&Number(s.birth.slice(5,7))===m).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')).map(s=>s.name);if(names.length)items.push({key:`b-${y}-${m}`,title:`🎂 Aniversariantes de ${months[m-1]}`,date:lastSat(y,m),type:'Último sábado do mês',detail:names.join(', ')})}
  const seen=new Set<string>();
  const up=items.filter(i=>i.date>=today&&Number(i.date.slice(0,4))===year).sort((a,b)=>a.date.localeCompare(b.date)).filter(i=>{const k=i.date+'|'+i.title;if(seen.has(k))return false;seen.add(k);return true});
  return <>
    <div className="hero"><p>Visão geral</p><h1>Gestão de sábado, simples e organizada.</h1><span>Acompanhe alunos, chamadas, professores, eventos e aniversários em um só lugar.</span></div>
    <div className="grid"><Card t="Alunos" v={data.students.length}/><Card t="Professores e admins" v={data.users.length}/><Card t="Aulas registradas" v={data.attendance.length}/><Card t="Presenças registradas" v={pres}/></div>
    <h2>Gráficos</h2>
    <div className="dashboard-charts">
      <div className="chart-card"><div className="chart-title"><b>Presenças por mês</b><small>{currentYear}</small></div><div className="bar-chart">{monthly.map(m=><div className="bar-col" key={m.label}><div className="bar-value">{m.present}</div><div className="bar-track"><div className="bar-fill" style={{height:Math.max(4,m.present/maxMonthly*100)+'%'}}/></div><small>{m.label}</small></div>)}</div></div>
      <div className="chart-card"><div className="chart-title"><b>Alunos por turma</b><small>Total: {data.students.length}</small></div><div className="group-chart"><div className="donut" style={{background:`conic-gradient(#2864dc 0 ${menorPct}%, #6ea0ff ${menorPct}% ${menorPct+adPct}%, #cbd5e1 ${menorPct+adPct}% 100%)`}}><div><strong>{data.students.length}</strong><small>alunos</small></div></div><div className="chart-legend"><span><i className="dot menores"/>Menores <b>{groups.menores}</b></span><span><i className="dot adolescentes"/>Adolescentes <b>{groups.adolescentes}</b></span><span><i className="dot definir"/>A definir <b>{groups.definir}</b></span></div></div></div>
      <div className="chart-card chart-wide"><div className="chart-title"><b>Top 5 presenças</b><small>{currentYear}</small></div><div className="ranking-chart">{ranking.map((r,i)=><div className="rank-row" key={r.name}><span className="rank-pos">{i+1}</span><span className="rank-name">{r.name}</span><div className="rank-track"><div className="rank-fill" style={{width:(r.count/rankMax*100)+'%'}}/></div><b>{r.count}</b></div>)}</div></div>
    </div>
    <h2>Próximos eventos</h2><div className="months">{years.map(y=><button key={y} className={year===y?'active':''} onClick={()=>setYear(y)}>{y}</button>)}</div><div className="panel">{up.map(i=><div className="row" key={i.key}><div><b>{i.title}</b><small>{i.type}{i.detail?' · '+i.detail:''}</small></div><span>{fmt(i.date)} {i.time||''}</span></div>)}{!up.length&&<Empty text={`Nenhum próximo evento em ${year}.`}/>}</div>
  </>
}

function Students({data,reload,toast}:{data:Data;admin:boolean;reload:()=>Promise<void>;toast:(s:string)=>void}){
  const blank={name:'',birth:'',group:'A definir',guardian:'',phone:'',notes:'',ageInfo:''};const[f,setF]=useState(blank),[edit,setEdit]=useState<Student|null>(null);
  const save=async()=>{if(!f.name.trim())return toast('Informe o nome do aluno.');const{error}=await supabase.from('sabado_students').insert({name:f.name,birth:f.birth||null,group_name:f.group,guardian:f.guardian,phone:f.phone,notes:f.notes,age_info:f.ageInfo});if(error)return toast(error.message);setF(blank);await reload();toast('Aluno salvo.')};
  const update=async()=>{if(!edit)return;const{error}=await supabase.from('sabado_students').update({name:edit.name,birth:edit.birth||null,group_name:edit.group,guardian:edit.guardian,phone:edit.phone,notes:edit.notes,age_info:edit.ageInfo}).eq('id',edit.id);if(error)return toast(error.message);setEdit(null);await reload();toast('Aluno alterado.')};
  const del=async(s:Student)=>{if(!confirm('Excluir '+s.name+'?'))return;const{error}=await supabase.from('sabado_students').delete().eq('id',s.id);if(error)return toast(error.message);await reload();toast('Aluno excluído.')};
  const pdf=()=>{const w=window.open('','_blank');if(!w)return;const rows=[...data.students].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')).map((s,i)=>`<tr><td>${i+1}</td><td>${s.name}</td><td>${s.group}</td><td>${s.birth?fmt(s.birth):'-'}</td><td>${s.ageInfo||'-'}</td><td>${s.guardian||'-'}</td><td>${s.phone||'-'}</td></tr>`).join('');w.document.write(`<html><style>@page{size:A4 landscape}body{font-family:Arial}table{width:100%;border-collapse:collapse}td,th{border:1px solid #aaa;padding:5px;font-size:10px}</style><body><h2>Lista de Alunos</h2><p>Total: ${data.students.length}</p><table><tr><th>#</th><th>Nome</th><th>Turma</th><th>Nascimento</th><th>Idade</th><th>Responsável</th><th>Telefone</th></tr>${rows}</table><script>print()</script></body></html>`);w.document.close()};
  return <><div className="section-head"><Title t="Alunos" s="Cadastre e mantenha os dados dos alunos salvos."/><button className="primary pdf-button" onClick={pdf}><Save size={17}/> Salvar lista em PDF</button></div>
  <div className="panel form data-form"><h3><Plus size={18}/> Novo aluno</h3><input placeholder="Nome completo *" value={f.name} onChange={e=>setF({...f,name:e.target.value})}/><input type="date" value={f.birth} onChange={e=>setF({...f,birth:e.target.value})}/><input placeholder="Idade (ex.: 12 anos)" value={f.ageInfo} onChange={e=>setF({...f,ageInfo:e.target.value})}/><select value={f.group} onChange={e=>setF({...f,group:e.target.value})}><option>A definir</option><option>Menores</option><option>Adolescentes</option></select><input placeholder="Responsável" value={f.guardian} onChange={e=>setF({...f,guardian:e.target.value})}/><input placeholder="Telefone / WhatsApp" value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/><input placeholder="Informações importantes" value={f.notes} onChange={e=>setF({...f,notes:e.target.value})}/><button className="primary" onClick={save}><Save size={17}/> Salvar aluno</button></div>
  <div className="cards">{data.students.map(s=><div className="person" key={s.id}><div className="avatar">{s.name[0]}</div><div><b>{s.name}</b><small>{s.group} · {s.birth?fmt(s.birth):'Nascimento não informado'} · {s.ageInfo||'Idade não informada'}</small><small>{s.guardian||'Responsável não informado'}</small></div><div className="record-actions"><button className="edit-icon" onClick={()=>setEdit({...s})}><Pencil size={16}/></button><button className="danger-icon" onClick={()=>del(s)}><Trash2 size={16}/></button></div></div>)}</div>
  {edit&&<Modal title="Alterar aluno" close={()=>setEdit(null)}><input value={edit.name} onChange={e=>setEdit({...edit,name:e.target.value})}/><input type="date" value={edit.birth} onChange={e=>setEdit({...edit,birth:e.target.value})}/><input value={edit.ageInfo} placeholder="Idade" onChange={e=>setEdit({...edit,ageInfo:e.target.value})}/><select value={edit.group} onChange={e=>setEdit({...edit,group:e.target.value})}><option>A definir</option><option>Menores</option><option>Adolescentes</option></select><input value={edit.guardian} placeholder="Responsável" onChange={e=>setEdit({...edit,guardian:e.target.value})}/><input value={edit.phone} placeholder="Telefone" onChange={e=>setEdit({...edit,phone:e.target.value})}/><input value={edit.notes} placeholder="Informações importantes" onChange={e=>setEdit({...edit,notes:e.target.value})}/><button className="primary" onClick={update}>Salvar alterações</button></Modal>}</>
}

function Mothers({data,reload,toast}:{data:Data;admin:boolean;reload:()=>Promise<void>;toast:(s:string)=>void}){
  const blank={name:'',phone:'',email:'',notes:'',active:true,birth:'',ageInfo:''};const[f,setF]=useState(blank),[edit,setEdit]=useState<Mother|null>(null);
  const payload=(x:any)=>({name:x.name,phone:x.phone,email:x.email,notes:x.notes,active:x.active,birth:x.birth||null,age_info:x.ageInfo});
  const save=async()=>{if(!f.name.trim())return toast('Informe o nome.');const{error}=await supabase.from('sabado_mothers').insert(payload(f));if(error)return toast(error.message);setF(blank);await reload();toast('Mãe cadastrada.')};
  const update=async()=>{if(!edit)return;const{error}=await supabase.from('sabado_mothers').update(payload(edit)).eq('id',edit.id);if(error)return toast(error.message);setEdit(null);await reload();toast('Cadastro alterado.')};
  const del=async(m:Mother)=>{if(!confirm('Excluir '+m.name+'?'))return;const{error}=await supabase.from('sabado_mothers').delete().eq('id',m.id);if(error)return toast(error.message);await reload();toast('Cadastro excluído.')};
  return <><Title t="Mães" s="Cadastre as mães que auxiliam nas atividades e limpeza."/><div className="panel form data-form"><h3><Heart size={18}/> Nova mãe auxiliar</h3><input placeholder="Nome completo *" value={f.name} onChange={e=>setF({...f,name:e.target.value})}/><input placeholder="Telefone / WhatsApp" value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/><input type="email" placeholder="E-mail" value={f.email} onChange={e=>setF({...f,email:e.target.value})}/><input type="date" value={f.birth} onChange={e=>setF({...f,birth:e.target.value})}/><input placeholder="Idade (ex.: 35 anos)" value={f.ageInfo} onChange={e=>setF({...f,ageInfo:e.target.value})}/><input placeholder="Observações" value={f.notes} onChange={e=>setF({...f,notes:e.target.value})}/><label className="checkline"><input type="checkbox" checked={f.active} onChange={e=>setF({...f,active:e.target.checked})}/> Ativa</label><button className="primary" onClick={save}><Save size={17}/> Salvar mãe</button></div>
  <div className="cards">{data.mothers.map(m=><div className="person" key={m.id}><div className="avatar">{m.name[0]}</div><div><b>{m.name}</b><small>{m.birth?fmt(m.birth):'Nascimento não informado'} · {m.ageInfo||'Idade não informada'}</small><small>{m.phone||'Telefone não informado'}</small><small>{m.active?'Ativa · Auxílio na limpeza':'Inativa'}</small></div><div className="record-actions"><button className="edit-icon" onClick={()=>setEdit({...m})}><Pencil size={16}/></button><button className="danger-icon outline-danger" onClick={()=>del(m)}><Trash2 size={16}/></button></div></div>)}</div>
  {edit&&<Modal title="Alterar mãe" close={()=>setEdit(null)}><input value={edit.name} onChange={e=>setEdit({...edit,name:e.target.value})}/><input value={edit.phone} onChange={e=>setEdit({...edit,phone:e.target.value})}/><input value={edit.email} onChange={e=>setEdit({...edit,email:e.target.value})}/><input type="date" value={edit.birth} onChange={e=>setEdit({...edit,birth:e.target.value})}/><input value={edit.ageInfo} placeholder="Idade" onChange={e=>setEdit({...edit,ageInfo:e.target.value})}/><input value={edit.notes} onChange={e=>setEdit({...edit,notes:e.target.value})}/><label className="checkline"><input type="checkbox" checked={edit.active} onChange={e=>setEdit({...edit,active:e.target.checked})}/> Ativa</label><button className="primary" onClick={update}>Salvar alterações</button></Modal>}</>
}

function Schedules({data,reload,toast}:{data:Data;admin:boolean;reload:()=>Promise<void>;toast:(s:string)=>void}){
  const blank={date:'',adolescentTeacher:'',youngerTeacher:'',cleaningHelper:'',topic:'',replacementReason:''};const[f,setF]=useState(blank),[edit,setEdit]=useState<Schedule|null>(null),[showAdd,setShowAdd]=useState(false);
  const teacherNames=[...new Set(data.users.filter(u=>u.role==='Professor').map(u=>u.name).concat(data.schedules.flatMap(s=>[s.adolescentTeacher,s.youngerTeacher])))].filter(Boolean).sort();
  const payload=(x:any)=>({date:x.date,adolescent_teacher:x.adolescentTeacher,younger_teacher:x.youngerTeacher,cleaning_helper:x.cleaningHelper,topic:x.topic,replacement_reason:x.replacementReason||''});
  const save=async()=>{if(!f.date||!f.adolescentTeacher||!f.youngerTeacher||!f.topic)return toast('Preencha data, professores e assunto.');const{error}=await supabase.from('sabado_schedules').insert(payload(f));if(error)return toast(error.message);setF(blank);setShowAdd(false);await reload();toast('Escala adicionada.')};
  const update=async()=>{if(!edit)return;const{error}=await supabase.from('sabado_schedules').update(payload(edit)).eq('id',edit.id);if(error)return toast(error.message);setEdit(null);await reload();toast('Escala alterada.')};
  const del=async(s:Schedule)=>{if(!confirm('Excluir esta escala?'))return;const{error}=await supabase.from('sabado_schedules').delete().eq('id',s.id);if(error)return toast(error.message);await reload();toast('Escala excluída.')};
  return <><div className="section-head"><Title t="Escalas" s="Professores dos adolescentes, professores dos menores, mães auxiliares e assunto de cada sábado."/><button className="primary compact-action" onClick={()=>setShowAdd(true)}><Plus size={17}/> Adicionar escala</button></div>
  {showAdd&&<div className="panel form data-form schedule-add-form"><div className="schedule-form-head"><h3><Plus size={18}/> Nova escala</h3><button className="icon-close schedule-form-close" title="Fechar" onClick={()=>setShowAdd(false)}><X size={18}/></button></div><input type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})}/><select value={f.adolescentTeacher} onChange={e=>setF({...f,adolescentTeacher:e.target.value})}><option value="">Professor — Adolescentes</option>{teacherNames.map(t=><option key={t}>{t}</option>)}</select><select value={f.youngerTeacher} onChange={e=>setF({...f,youngerTeacher:e.target.value})}><option value="">Professor — Menores</option>{teacherNames.map(t=><option key={t}>{t}</option>)}</select><select value={f.cleaningHelper} onChange={e=>setF({...f,cleaningHelper:e.target.value})}><option value="">Mãe — Auxílio na Limpeza</option>{data.mothers.filter(m=>m.active).map(m=><option key={m.id}>{m.name}</option>)}</select><input placeholder="Tema da palestra / assunto" value={f.topic} onChange={e=>setF({...f,topic:e.target.value})}/><button className="primary" onClick={save}><Save size={17}/> Salvar escala</button></div>}
  <div className="panel schedule-panel">{data.schedules.map(s=><div className="schedule-row" key={s.id}><div className="schedule-date"><b>{fmt(s.date)}</b><small>sábado</small><div className="schedule-actions"><button className="edit-schedule" onClick={()=>setEdit({...s})}><Pencil size={15}/> Alterar</button><button className="danger-icon schedule-delete" title="Excluir escala" onClick={()=>del(s)}><Trash2 size={15}/></button></div></div><div className="schedule-field"><span className="field-label">Adolescentes</span><span className="text-separator">-</span><b>{s.adolescentTeacher}</b></div><div className="schedule-field"><span className="field-label">Menores</span><span className="text-separator">-</span><b>{s.youngerTeacher}</b></div><div className="schedule-field"><span className="field-label">Mãe - limpeza</span><span className="text-separator">-</span><b>{s.cleaningHelper||'—'}</b></div><div className="schedule-topic schedule-field"><span className="field-label">Assunto</span><span className="text-separator">-</span><b>{s.topic}</b></div></div>)}</div>
  {edit&&<Modal title="Alterar escala" close={()=>setEdit(null)}><label>Professor — Adolescentes</label><select value={edit.adolescentTeacher} onChange={e=>setEdit({...edit,adolescentTeacher:e.target.value})}>{teacherNames.map(t=><option key={t}>{t}</option>)}</select><label>Professor — Menores</label><select value={edit.youngerTeacher} onChange={e=>setEdit({...edit,youngerTeacher:e.target.value})}>{teacherNames.map(t=><option key={t}>{t}</option>)}</select><label>Mãe — Auxílio na Limpeza</label><select value={edit.cleaningHelper} onChange={e=>setEdit({...edit,cleaningHelper:e.target.value})}><option value="">—</option>{data.mothers.filter(m=>m.active).map(m=><option key={m.id}>{m.name}</option>)}</select><label>Assunto</label><input value={edit.topic} onChange={e=>setEdit({...edit,topic:e.target.value})}/><label>Motivo da substituição</label><input value={edit.replacementReason} onChange={e=>setEdit({...edit,replacementReason:e.target.value})}/><button className="primary" onClick={update}>Salvar alteração</button></Modal>}</>
}

function Meetings({data,reload,toast,setMeeting}:{data:Data;admin:boolean;reload:()=>Promise<void>;toast:(s:string)=>void;setMeeting:(m:Meeting)=>void}){
  const blank={title:'',date:'',time:'',location:'',notes:''};const[f,setF]=useState(blank),[edit,setEdit]=useState<Meeting|null>(null);
  const formatMeetingTime=(value:string)=>{const digits=value.replace(/\D/g,'').slice(0,4);if(digits.length<=2)return digits;return digits.slice(0,2)+':'+digits.slice(2)};
  const validMeetingTime=(value:string)=>!value||/^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  const save=async()=>{if(!f.title||!f.date)return toast('Informe título e data.');if(!validMeetingTime(f.time))return toast('Informe um horário válido no formato HH:MM.');const{error}=await supabase.from('sabado_meetings').insert({...f,time:f.time||null});if(error)return toast(error.message);setF(blank);await reload();toast('Reunião marcada.')};
  const update=async()=>{if(!edit)return;if(!validMeetingTime(edit.time))return toast('Informe um horário válido no formato HH:MM.');const{error}=await supabase.from('sabado_meetings').update({title:edit.title,date:edit.date,time:edit.time||null,location:edit.location,notes:edit.notes,updated_at:new Date().toISOString()}).eq('id',edit.id);if(error)return toast(error.message);await supabase.from('sabado_meeting_responses').delete().eq('meeting_id',edit.id);setEdit(null);await reload();toast('Reunião reagendada.')};
  const del=async(m:Meeting)=>{if(!confirm('Excluir reunião "'+m.title+'"?'))return;const{error}=await supabase.from('sabado_meetings').delete().eq('id',m.id);if(error)return toast(error.message);await reload();toast('Reunião excluída.')};
  return <><Title t="Reuniões" s="Marque reuniões, acompanhe confirmações e avise todos os professores pelo sistema."/><div className="panel form data-form meeting-form"><h3><CalendarDays size={18}/> Nova reunião</h3><input placeholder="Título da reunião *" value={f.title} onChange={e=>setF({...f,title:e.target.value})}/><input type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})}/><input className="meeting-time-input" type="text" inputMode="numeric" maxLength={5} placeholder="Horário (HH:MM)" value={f.time} onChange={e=>setF({...f,time:formatMeetingTime(e.target.value)})}/><input placeholder="Local" value={f.location} onChange={e=>setF({...f,location:e.target.value})}/><input placeholder="Observações / pauta" value={f.notes} onChange={e=>setF({...f,notes:e.target.value})}/><button className="primary" onClick={save}><Bell size={17}/> Marcar e notificar professores</button></div>
  <div className="panel"><h3>Reuniões marcadas</h3>{data.meetings.map(m=>{const yes=data.responses.filter(r=>r.meetingId===m.id&&r.status==='yes'),no=data.responses.filter(r=>r.meetingId===m.id&&r.status==='no');return <div className="meeting-card" key={m.id}><div className="meeting-main"><div><b>{m.title}</b><small>{fmt(m.date)} {m.time} {m.location&&'· '+m.location}</small></div><div className="meeting-actions"><button className="notice-action" onClick={()=>setMeeting(m)}>Responder</button><button className="edit-icon" onClick={()=>setEdit({...m})}><Pencil size={16}/> Reagendar</button><button className="danger-icon" onClick={()=>del(m)}><Trash2 size={16}/> Excluir</button></div></div><div className="rsvp-summary"><div className="rsvp-box yes"><b>✅ Vai participar</b>{yes.length?yes.map(r=><span key={r.id}>{r.userName}</span>):<small>Ninguém confirmou ainda.</small>}</div><div className="rsvp-box no"><b>❌ Não poderá</b>{no.length?no.map(r=><span key={r.id}>{r.userName}</span>):<small>Ninguém informou ausência.</small>}</div></div></div>})}{!data.meetings.length&&<Empty text="Nenhuma reunião marcada."/>}</div>
  {edit&&<Modal title="Reagendar reunião" close={()=>setEdit(null)}><input value={edit.title} onChange={e=>setEdit({...edit,title:e.target.value})}/><input type="date" value={edit.date} onChange={e=>setEdit({...edit,date:e.target.value})}/><input className="meeting-time-input" type="text" inputMode="numeric" maxLength={5} placeholder="Horário (HH:MM)" value={edit.time} onChange={e=>setEdit({...edit,time:formatMeetingTime(e.target.value)})}/><input value={edit.location} placeholder="Local" onChange={e=>setEdit({...edit,location:e.target.value})}/><input value={edit.notes} placeholder="Observações / pauta" onChange={e=>setEdit({...edit,notes:e.target.value})}/><button className="primary" onClick={update}>Salvar reagendamento</button></Modal>}</>
}

function AttendancePage({data,reload,toast}:{data:Data;admin:boolean;reload:()=>Promise<void>;toast:(s:string)=>void}){
  const currentYear=new Date().getFullYear();
  const[date,setDate]=useState(new Date().toISOString().slice(0,10)),[teacher,setTeacher]=useState(''),[group,setGroup]=useState('Todos os alunos'),[year,setYear]=useState(currentYear),[marks,setMarks]=useState<Record<string,boolean>>({});
  const list=data.students.filter(s=>group==='Todos os alunos'||s.group===group).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
  const teachers=[...new Set(data.users.filter(u=>u.role==='Professor'&&u.status!=='Inativo').map(u=>u.name).concat(data.schedules.flatMap(s=>[s.adolescentTeacher,s.youngerTeacher])))].filter(Boolean).sort();
  const years=[...new Set([currentYear,...data.attendance.map(a=>Number(a.date.slice(0,4))).filter(Boolean)])].sort((a,b)=>b-a);
  const counts:Record<string,number>={};
  data.attendance.filter(a=>Number(a.date.slice(0,4))===year).forEach(a=>a.entries.forEach(e=>{if(e.present)counts[e.studentId]=(counts[e.studentId]||0)+1}));
  const medal=(c:number)=>c>=20?'🥇':c>=15?'🥉':c>=10?'🥈':'';
  const save=async()=>{if(!teacher)return toast('Selecione o professor responsável.');const entries=list.map(s=>({studentId:s.id,name:s.name,present:marks[s.id]===true}));const{error}=await supabase.from('sabado_attendance').insert({date,teacher,group_name:group,entries});if(error)return toast(error.message);setMarks({});await reload();toast('Chamada salva.')};
  return <><Title t="Chamada" s="Marque Sim ou Não e salve o registro da aula."/><div className="panel controls"><input type="date" value={date} onChange={e=>setDate(e.target.value)}/><select value={teacher} onChange={e=>setTeacher(e.target.value)}><option value="">Professor responsável</option>{teachers.map(t=><option key={t}>{t}</option>)}</select><select value={group} onChange={e=>setGroup(e.target.value)}><option>Todos os alunos</option><option>A definir</option><option>Menores</option><option>Adolescentes</option></select><select value={year} onChange={e=>setYear(Number(e.target.value))}>{years.map(y=><option key={y}>{y}</option>)}</select></div>
  <div className="annual-summary"><b>Controle anual de presença — {year}</b><span>A contagem considera somente chamadas salvas neste ano. Ao iniciar um novo ano, a contagem começa automaticamente em 0, mantendo o histórico dos anos anteriores.</span><div className="medal-legend"><span>🥈 10 presenças</span><span>🥉 15 presenças</span><span>🥇 20 presenças ou mais</span></div></div>
  <div className="panel">{list.map(s=>{const c=counts[s.id]||0;return <div className="att" key={s.id}><div className="att-student"><div className="identity-line"><b>{s.name}</b><span className="text-separator">-</span><small>{s.group}</small></div><span className="presence-count">{year}: {c} presenças {medal(c)&&<span className="medal">{medal(c)}</span>}</span></div><div><button className={marks[s.id]===true?'yes selected':'yes'} onClick={()=>setMarks({...marks,[s.id]:true})}>Sim</button><button className={marks[s.id]===false?'no selected':'no'} onClick={()=>setMarks({...marks,[s.id]:false})}>Não</button></div></div>})}<button className="primary wide" onClick={save}>Salvar chamada</button></div></>
}

function HistoryPage({data,admin,reload,toast}:{data:Data;admin:boolean;reload:()=>Promise<void>;toast:(s:string)=>void}){
  const[open,setOpen]=useState<string|null>(null);
  const del=async(a:Attendance)=>{if(!admin||!confirm('Excluir chamada?'))return;const{error}=await supabase.from('sabado_attendance').delete().eq('id',a.id);if(error)return toast(error.message);await reload();toast('Chamada excluída.')};
  return <><Title t="Histórico de Aulas" s="Datas, professores e chamadas que ficam registradas."/><div className="panel history-panel">{data.attendance.map(a=>{const p=a.entries.filter(e=>e.present).length;return <div className="history" key={a.id}><div className="history-head"><button onClick={()=>setOpen(open===a.id?null:a.id)}><div><b>{fmt(a.date)}</b><small>Professor: {a.teacher} · {a.group}</small></div><span>{p} presentes · {a.entries.length-p} faltas</span></button>{admin&&<button className="danger-icon" onClick={()=>del(a)}><Trash2 size={15}/></button>}</div>{open===a.id&&<div className="details">{a.entries.map(e=><div key={e.studentId}><span>{e.name}</span><b className={e.present?'green':'red'}>{e.present?'Presente':'Faltou'}</b></div>)}</div>}</div>})}{!data.attendance.length&&<Empty text="Nenhuma chamada salva ainda."/>}</div></>
}

function Birthdays({data}:{data:Data}){const[m,setM]=useState(new Date().getMonth());const list=useMemo(()=>data.students.filter(s=>s.birth&&Number(s.birth.slice(5,7))===m+1).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')),[data,m]);return <><Title t="Aniversariantes do Mês" s="Controle mensal dos aniversários dos alunos."/><div className="months birthday-months">{months.map((x,i)=><button key={x} className={m===i?'active':''} onClick={()=>setM(i)}>{x}</button>)}</div><div className="birthday-list">{list.map(s=><div className="person" key={s.id}><div className="avatar">🎂</div><div><b>{s.name}</b><small>{fmt(s.birth)} · {s.group}</small></div></div>)}{!list.length&&<Empty text={'Nenhum aniversariante em '+months[m]+'.'}/>}</div></>}

function Calendar({data,reload,toast}:{data:Data;admin:boolean;reload:()=>Promise<void>;toast:(s:string)=>void}){
  const blank={title:'',date:'',type:'Evento',time:'',notes:''};const[f,setF]=useState(blank),[edit,setEdit]=useState<EventItem|null>(null);
  const payload=(x:any)=>({title:x.title,date:x.date,type:x.type,time:x.time||null,notes:x.notes});
  const save=async()=>{if(!f.title||!f.date)return toast('Informe título e data.');if(!validMobileTime(f.time))return toast('Informe um horário válido no formato HH:MM.');const{error}=await supabase.from('sabado_events').insert(payload(f));if(error)return toast(error.message);setF(blank);await reload();toast('Evento salvo.')};
  const update=async()=>{if(!edit)return;if(!validMobileTime(edit.time))return toast('Informe um horário válido no formato HH:MM.');const{error}=await supabase.from('sabado_events').update(payload(edit)).eq('id',edit.id);if(error)return toast(error.message);setEdit(null);await reload();toast('Evento alterado.')};
  const del=async(e:EventItem)=>{if(!confirm('Excluir '+e.title+'?'))return;const{error}=await supabase.from('sabado_events').delete().eq('id',e.id);if(error)return toast(error.message);await reload();toast('Evento excluído.')};
  return <><Title t="Calendário" s="Aulas, reuniões, eventos, campanhas e apresentações."/><div className="panel form"><input placeholder="Título *" value={f.title} onChange={e=>setF({...f,title:e.target.value})}/><input type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})}/><input className="mobile-time-input" type="text" inputMode="numeric" maxLength={5} placeholder="Horário (HH:MM)" value={f.time} onChange={e=>setF({...f,time:formatMobileTime(e.target.value)})}/><select value={f.type} onChange={e=>setF({...f,type:e.target.value})}><option>Aula</option><option>Reunião</option><option>Evento</option><option>Campanha</option><option>Apresentação</option><option>Festa</option></select><input placeholder="Observações" value={f.notes} onChange={e=>setF({...f,notes:e.target.value})}/><button className="primary" onClick={save}><Plus size={17}/> Registrar no calendário</button></div><div className="panel">{data.events.map(e=><div className="row" key={e.id}><div><b>{e.title}</b><small>{e.type} · {e.notes}</small></div><div className="event-actions"><span>{fmt(e.date)} {e.time}</span><button className="edit-icon" onClick={()=>setEdit({...e})}><Pencil size={16}/> Alterar</button><button className="danger-icon" onClick={()=>del(e)}><Trash2 size={16}/> Excluir</button></div></div>)}</div>{edit&&<Modal title="Alterar lançamento" close={()=>setEdit(null)}><input value={edit.title} onChange={e=>setEdit({...edit,title:e.target.value})}/><input type="date" value={edit.date} onChange={e=>setEdit({...edit,date:e.target.value})}/><input className="mobile-time-input" type="text" inputMode="numeric" maxLength={5} placeholder="Horário (HH:MM)" value={edit.time} onChange={e=>setEdit({...edit,time:formatMobileTime(e.target.value)})}/><select value={edit.type} onChange={e=>setEdit({...edit,type:e.target.value})}><option>Aula</option><option>Reunião</option><option>Evento</option><option>Campanha</option><option>Apresentação</option><option>Festa</option></select><input value={edit.notes} onChange={e=>setEdit({...edit,notes:e.target.value})}/><button className="primary" onClick={update}>Salvar alteração</button></Modal>}</>
}

function Celebrations({data,reload,toast}:{data:Data;admin:boolean;reload:()=>Promise<void>;toast:(s:string)=>void}){
  const[pick,setPick]=useState<{title:string;date:string;time:string;notes:string}|null>(null),[edit,setEdit]=useState<EventItem|null>(null),[showAdd,setShowAdd]=useState(false),[custom,setCustom]=useState({title:'',date:'',time:'',notes:''});
  const savePick=async()=>{if(!pick?.date)return;if(!validMobileTime(pick.time))return toast('Informe um horário válido no formato HH:MM.');const{error}=await supabase.from('sabado_events').insert({title:pick.title,date:pick.date,type:'Festa',time:pick.time||null,notes:pick.notes});if(error)return toast(error.message);setPick(null);await reload();toast('Comemoração salva.')};
  const saveCustom=async()=>{if(!custom.title||!custom.date)return;if(!validMobileTime(custom.time))return toast('Informe um horário válido no formato HH:MM.');const{error}=await supabase.from('sabado_events').insert({title:custom.title,date:custom.date,type:'Festa',time:custom.time||null,notes:custom.notes});if(error)return toast(error.message);setCustom({title:'',date:'',time:'',notes:''});setShowAdd(false);await reload();toast('Comemoração salva.')};
  const update=async()=>{if(!edit)return;if(!validMobileTime(edit.time))return toast('Informe um horário válido no formato HH:MM.');const{error}=await supabase.from('sabado_events').update({title:edit.title,date:edit.date,time:edit.time||null,notes:edit.notes}).eq('id',edit.id);if(error)return toast(error.message);setEdit(null);await reload();toast('Comemoração alterada.')};
  const del=async(e:EventItem)=>{if(!confirm('Excluir '+e.title+'?'))return;const{error}=await supabase.from('sabado_events').delete().eq('id',e.id);if(error)return toast(error.message);await reload();toast('Comemoração excluída.')};
  return <><div className="section-head"><Title t="🎉 Datas Comemorativas Gerais" s="As datas lançadas aqui aparecem automaticamente no painel principal."/><button className="primary" onClick={()=>setShowAdd(true)}><Plus size={17}/> Adicionar comemoração</button></div><div className="celebs">{celebrationCards.map(([month,name])=><div className="celeb" key={name}><span>🎉</span><div><small>{month}</small><h3>{name}</h3></div><button onClick={()=>setPick({title:name,date:'',time:'',notes:'Data comemorativa'})}>Marcar festa</button></div>)}</div><h2>Festas já marcadas</h2><div className="panel">{data.events.filter(e=>e.type==='Festa').map(e=><div className="row" key={e.id}><div><b>{e.title}</b><small>{e.notes||'Sem observações'}</small></div><div className="event-actions"><span>{fmt(e.date)} {e.time}</span><button className="edit-icon" onClick={()=>setEdit({...e})}><Pencil size={16}/> Alterar</button><button className="danger-icon" onClick={()=>del(e)}><Trash2 size={16}/> Excluir</button></div></div>)}</div>
  {pick&&<Modal title={'Marcar festa · '+pick.title} close={()=>setPick(null)}><input type="date" value={pick.date} onChange={e=>setPick({...pick,date:e.target.value})}/><input className="mobile-time-input" type="text" inputMode="numeric" maxLength={5} placeholder="Horário (HH:MM)" value={pick.time} onChange={e=>setPick({...pick,time:formatMobileTime(e.target.value)})}/><input value={pick.notes} onChange={e=>setPick({...pick,notes:e.target.value})}/><button className="primary" onClick={savePick}>Salvar festa</button></Modal>}
  {showAdd&&<Modal title="Adicionar data comemorativa" close={()=>setShowAdd(false)}><input placeholder="Nome da comemoração" value={custom.title} onChange={e=>setCustom({...custom,title:e.target.value})}/><input type="date" value={custom.date} onChange={e=>setCustom({...custom,date:e.target.value})}/><input className="mobile-time-input" type="text" inputMode="numeric" maxLength={5} placeholder="Horário (HH:MM)" value={custom.time} onChange={e=>setCustom({...custom,time:formatMobileTime(e.target.value)})}/><input placeholder="Observações" value={custom.notes} onChange={e=>setCustom({...custom,notes:e.target.value})}/><button className="primary" onClick={saveCustom}>Salvar comemoração</button></Modal>}
  {edit&&<Modal title="Alterar comemoração" close={()=>setEdit(null)}><input value={edit.title} onChange={e=>setEdit({...edit,title:e.target.value})}/><input type="date" value={edit.date} onChange={e=>setEdit({...edit,date:e.target.value})}/><input className="mobile-time-input" type="text" inputMode="numeric" maxLength={5} placeholder="Horário (HH:MM)" value={edit.time} onChange={e=>setEdit({...edit,time:formatMobileTime(e.target.value)})}/><input value={edit.notes} onChange={e=>setEdit({...edit,notes:e.target.value})}/><button className="primary" onClick={update}>Salvar alteração</button></Modal>}</>
}

function UsersPage({data,admin,reload,toast}:{data:Data;admin:boolean;reload:()=>Promise<void>;toast:(s:string)=>void}){
  const blank={name:'',email:'',phone:'',group:'Geral',status:'Ativo'};
  const[f,setF]=useState(blank),[edit,setEdit]=useState<UserRec|null>(null);
  const visibleUsers=admin?data.users:data.users.filter(u=>u.role==='Professor');
  const save=async()=>{
    if(!f.name.trim())return toast('Informe o nome do professor.');
    const{error}=await supabase.from('sabado_users').insert({name:f.name,email:f.email,phone:f.phone,role:'Professor',group_name:f.group,status:f.status});
    if(error)return toast(error.message);
    setF(blank);await reload();toast('Professor cadastrado.');
  };
  const update=async()=>{
    if(!edit)return;
    const payload=admin?{name:edit.name,email:edit.email,phone:edit.phone,role:edit.role,group_name:edit.group,status:edit.status}:{name:edit.name,email:edit.email,phone:edit.phone,role:'Professor',group_name:edit.group,status:edit.status};
    const{error}=await supabase.from('sabado_users').update(payload).eq('id',edit.id);
    if(error)return toast(error.message);
    setEdit(null);await reload();toast('Professor alterado.');
  };
  const del=async(u:UserRec)=>{
    if(u.email?.toLowerCase()===ADMIN_EMAIL)return toast('O Super Administrador não pode ser excluído aqui.');
    if(!confirm('Excluir '+u.name+'?'))return;
    const{error}=await supabase.from('sabado_users').delete().eq('id',u.id);
    if(error)return toast(error.message);
    await reload();toast('Professor excluído.');
  };
  return <><Title t={admin?'Professores e Acessos':'Professores'} s="Cadastre os professores que aparecem nas escalas e nas confirmações de reunião."/>
  <div className="panel form"><input placeholder="Nome do professor *" value={f.name} onChange={e=>setF({...f,name:e.target.value})}/><input type="email" placeholder="E-mail" value={f.email} onChange={e=>setF({...f,email:e.target.value})}/><input placeholder="Telefone / WhatsApp" value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/><select value={f.group} onChange={e=>setF({...f,group:e.target.value})}><option>Geral</option><option>Menores</option><option>Adolescentes</option></select><select value={f.status} onChange={e=>setF({...f,status:e.target.value})}><option>Ativo</option><option>Inativo</option></select><button className="primary" onClick={save}><Plus size={17}/> Cadastrar professor</button></div>
  <div className="cards">{visibleUsers.map(u=><div className="person" key={u.id}><div className="avatar">{u.name[0]}</div><div><b>{u.name}</b><small>{u.role} · {u.group} · {u.status}</small><small>{u.email||'Sem e-mail'} {u.phone&&'· '+u.phone}</small></div><div className="record-actions"><button className="edit-icon" onClick={()=>setEdit({...u})}><Pencil size={16}/></button>{u.email?.toLowerCase()!==ADMIN_EMAIL&&<button className="danger-icon" onClick={()=>del(u)}><Trash2 size={16}/></button>}</div></div>)}</div>
  {edit&&<Modal title="Alterar professor" close={()=>setEdit(null)}><input value={edit.name} onChange={e=>setEdit({...edit,name:e.target.value})}/><input type="email" value={edit.email} placeholder="E-mail" onChange={e=>setEdit({...edit,email:e.target.value})}/><input value={edit.phone} placeholder="Telefone / WhatsApp" onChange={e=>setEdit({...edit,phone:e.target.value})}/><select value={edit.group} onChange={e=>setEdit({...edit,group:e.target.value})}><option>Geral</option><option>Menores</option><option>Adolescentes</option></select><select value={edit.status} onChange={e=>setEdit({...edit,status:e.target.value})}><option>Ativo</option><option>Inativo</option></select>{admin&&<select value={edit.role} onChange={e=>setEdit({...edit,role:e.target.value})}><option>Professor</option><option>Administrador</option></select>}<button className="primary" onClick={update}>Salvar alterações</button></Modal>}</>
}


function AuditPage(){
  const[logs,setLogs]=useState<AuditLog[]>([]),[loading,setLoading]=useState(true),[search,setSearch]=useState(''),[action,setAction]=useState('Todos'),[entity,setEntity]=useState('Todos'),[open,setOpen]=useState<string|null>(null);
  const load=async()=>{
    setLoading(true);
    const{data,error}=await supabase.from('sabado_audit_logs').select('*').order('created_at',{ascending:false}).limit(500);
    if(!error){
      setLogs((data||[]).map((x:any)=>({
        id:x.id,action:x.action,entityType:x.entity_type,entityName:x.entity_name||'',recordId:x.record_id||'',
        actorName:x.actor_name||'Usuário sem login',actorEmail:x.actor_email||'',createdAt:x.created_at,
        beforeData:x.before_data||null,afterData:x.after_data||null
      })));
    }
    setLoading(false);
  };
  useEffect(()=>{load()},[]);
  const actionLabel=(a:string)=>a==='insert'?'Cadastrou':a==='update'?'Alterou':'Excluiu';
  const entities=['Todos',...Array.from(new Set(logs.map(x=>x.entityType))).sort()];
  const filtered=logs.filter(x=>{
    const q=search.trim().toLowerCase();
    const matchesSearch=!q||[x.actorName,x.actorEmail,x.entityType,x.entityName].some(v=>(v||'').toLowerCase().includes(q));
    return matchesSearch&&(action==='Todos'||x.action===action)&&(entity==='Todos'||x.entityType===entity);
  });
  const pretty=(v:any)=>JSON.stringify(v,null,2);
  return <><div className="section-head"><Title t="Registro de Auditoria" s="Veja quem cadastrou, alterou ou excluiu registros e em qual data e horário."/><button className="primary compact-action" onClick={load}>Atualizar</button></div>
  <div className="panel controls audit-controls"><input placeholder="Buscar por usuário ou registro" value={search} onChange={e=>setSearch(e.target.value)}/><select value={action} onChange={e=>setAction(e.target.value)}><option>Todos</option><option value="insert">Cadastrou</option><option value="update">Alterou</option><option value="delete">Excluiu</option></select><select value={entity} onChange={e=>setEntity(e.target.value)}>{entities.map(x=><option key={x}>{x}</option>)}</select></div>
  <div className="panel audit-panel">{loading?<div className="empty">Carregando auditoria...</div>:filtered.map(log=><div className="audit-row" key={log.id}><div className={'audit-action '+log.action}>{actionLabel(log.action)}</div><div className="audit-main"><b>{log.entityType}: {log.entityName||'Sem identificação'}</b><span><strong>{log.actorName}</strong>{log.actorEmail&&log.actorEmail!==log.actorName?' · '+log.actorEmail:''}</span><small>{new Date(log.createdAt).toLocaleString('pt-BR')}</small></div><button className="edit-icon" onClick={()=>setOpen(open===log.id?null:log.id)}>{open===log.id?'Ocultar':'Detalhes'}</button>{open===log.id&&<div className="audit-details">{log.beforeData&&<div><b>Antes</b><pre>{pretty(log.beforeData)}</pre></div>}{log.afterData&&<div><b>Depois</b><pre>{pretty(log.afterData)}</pre></div>}</div>}</div>)}{!loading&&!filtered.length&&<Empty text="Nenhum registro de auditoria encontrado."/>}</div></>
}

function SettingsPage({data,reload,toast}:{data:Data;reload:()=>Promise<void>;toast:(s:string)=>void}){const[f,setF]=useState(data.settings);const save=async()=>{const{error}=await supabase.from('sabado_settings').update({...f,updated_at:new Date().toISOString()}).eq('id',1);if(error)return toast(error.message);await reload();toast('Configurações salvas.')};return <><Title t="Configurações" s="Personalize o sistema."/><div className="panel form"><input value={f.name} onChange={e=>setF({...f,name:e.target.value})}/><input value={f.subtitle} onChange={e=>setF({...f,subtitle:e.target.value})}/><button className="primary" onClick={save}>Salvar</button></div></>}

function AdminPage({data,setPage}:{data:Data;setPage:(p:string)=>void}){return <><div className="hero"><p>Área exclusiva</p><h1>Painel do Super Administrador</h1><span>{ADMIN_EMAIL}</span></div><div className="grid"><Card t="Alunos" v={data.students.length}/><Card t="Professores" v={data.users.length}/><Card t="Chamadas" v={data.attendance.length}/><Card t="Notificações" v={data.notifications.length}/></div><div className="panel admin-links"><button className="primary" onClick={()=>setPage('users')}>Professores e Acessos</button><button className="primary" onClick={()=>setPage('history')}>Histórico de Chamadas</button><button className="primary" onClick={()=>setPage('audit')}>Registro de Auditoria</button><button className="primary" onClick={()=>setPage('settings')}>Configurações</button></div></>}

const Card=({t,v}:{t:string;v:any})=><div className="card"><span>{t}</span><strong>{v}</strong></div>;
const Title=({t,s}:{t:string;s:string})=><div className="title"><h1>{t}</h1><p>{s}</p></div>;
const Empty=({text}:{text:string})=><div className="empty">{text}</div>;
function Modal({title,close,children}:{title:string;close:()=>void;children:any}){return <div className="modal-backdrop"><div className="modal-card"><div className="modal-title"><h3>{title}</h3><button onClick={close}><X/></button></div>{children}</div></div>}
export default App;