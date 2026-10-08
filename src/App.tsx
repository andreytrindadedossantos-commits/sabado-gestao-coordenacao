import { useEffect, useMemo, useState } from 'react';
import {
  Activity, Bell, BookOpen, Cake, CalendarDays, ClipboardCheck, Copy, Database, Eye, EyeOff, HardDrive, Heart, History,
  KeyRound, LogIn, Menu, Moon, PartyPopper, Pencil, Plus, RefreshCw, Save, Server, Settings, ShieldCheck, Smartphone, Sun, Trash2,
  UserCog, Users, X
} from 'lucide-react';
import { supabase } from './supabase';
import { QRCodeSVG } from 'qrcode.react';

const ADMIN_EMAIL='andreytrindadedossantos@gmail.com';
const LOGIN_VALIDITY_KEY='sabado_login_valid_until';
const CUSTOM_SESSION_KEY='sabado_user_session_token';
const TRUSTED_2FA_DEVICE_KEY='sabado_2fa_trusted_device_token';
const TRUSTED_2FA_UNTIL_KEY='sabado_2fa_trusted_until';
const LOGIN_VALIDITY_MS=90*24*60*60*1000;
const renewLoginValidity=()=>localStorage.setItem(LOGIN_VALIDITY_KEY,String(Date.now()+LOGIN_VALIDITY_MS));
const loginExpired=()=>{const until=Number(localStorage.getItem(LOGIN_VALIDITY_KEY)||0);return until>0&&Date.now()>until};
const getDeviceInfo=()=>{
  const ua=navigator.userAgent||'';
  let browser='Navegador';
  if(/Edg\//.test(ua))browser='Microsoft Edge';
  else if(/OPR\//.test(ua))browser='Opera';
  else if(/Chrome\//.test(ua)&&!/Edg\//.test(ua))browser='Chrome';
  else if(/Firefox\//.test(ua))browser='Firefox';
  else if(/Safari\//.test(ua)&&/Version\//.test(ua))browser='Safari';

  let platform='Dispositivo';
  if(/Android/i.test(ua))platform='Android';
  else if(/iPhone|iPad|iPod/i.test(ua))platform='iOS';
  else if(/Windows/i.test(ua))platform='Windows';
  else if(/Macintosh|Mac OS X/i.test(ua))platform='macOS';
  else if(/Linux/i.test(ua))platform='Linux';

  let device=platform;
  if(/Android/i.test(ua)){
    const m=ua.match(/Android\s[^;)]*;\s*([^;)]+?)(?:\s+Build\/[^;)]+)?[;)]/i);
    if(m?.[1]){
      const model=m[1].replace(/\bwv\b/ig,'').trim();
      if(model&&!/^[a-z]{2}[-_][A-Z]{2}$/i.test(model))device=model;
    }
  }else if(/iPhone/i.test(ua))device='iPhone';
  else if(/iPad/i.test(ua))device='iPad';
  else if(/Windows|Macintosh|Linux/i.test(ua))device='Computador';

  return {device_name:device,browser_name:browser,platform_name:platform};
};
const months=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const celebrationCards=[['Março','Dia da Mulher'],['Abril','Páscoa'],['Maio','Dia das Mães'],['Agosto','Dia dos Pais'],['Outubro','Dia das Crianças'],['Dezembro','Natal']];

type Student={id:string;name:string;birth:string;group:string;guardian:string;phone:string;notes:string;ageInfo:string};
type UserRec={id:string;name:string;loginName:string;passwordCreated:boolean;twoFactorEnabled:boolean;email:string;phone:string;role:string;group:string;status:string;permissions:Record<string,boolean>};
type Mother={id:string;name:string;phone:string;email:string;notes:string;active:boolean;birth:string;ageInfo:string};
type Schedule={id:string;date:string;adolescentTeacher:string;youngerTeacher:string;cleaningHelper:string;topic:string;replacementReason:string};
type Attendance={id:string;date:string;teacher:string;group:string;entries:{studentId:string;name:string;present:boolean}[]};
type EventItem={id:string;title:string;date:string;type:string;time:string;notes:string};
type Meeting={id:string;title:string;date:string;time:string;location:string;notes:string};
type Response={id:string;meetingId:string;userId:string;userName:string;status:'yes'|'no'};
type Notice={id:string;title:string;body:string;date:string;kind:string;meetingId?:string};
type AuthorizedDevice={id:string;device_name:string;browser_name:string;platform_name:string;created_at:string;last_seen_at:string;expires_at:string;is_current:boolean;active_sessions:number};
type AuditLog={
 id:string;action:'insert'|'update'|'delete';entityType:string;entityName:string;recordId:string;
 actorName:string;actorEmail:string;createdAt:string;beforeData:any;afterData:any
};
type AcademicYear={year:number;status:'open'|'closed';closedAt:string;closedBy?:string;snapshot:any};
type TrashItem={id:string;table:string;type:string;name:string;date?:string;deletedAt:string};
type SystemOverview={app_version:string;status:string;checked_at:string;database_size_bytes:number;database_size_pretty:string;app_tables_size_bytes:number;app_tables_size_pretty:string;counts:Record<string,number>;trash:Record<string,number>;active_users:number;two_factor_enabled_users:number;closed_academic_years:number;last_audit_at:string|null;database_time:string;database_name:string;postgres_version:string};

type PermissionKey=
  |'view_home'|'view_students'|'manage_students'|'view_mothers'|'manage_mothers'
  |'view_schedules'|'manage_schedules'|'view_meetings'|'manage_meetings'
  |'view_attendance'|'manage_attendance'|'view_history'|'view_users'
  |'view_birthdays'|'view_calendar'|'manage_calendar'|'view_celebrations'|'manage_celebrations'|'view_academic_year';

const DEFAULT_TEACHER_PERMISSIONS:Record<PermissionKey,boolean>={
  view_home:true,
  view_students:true,manage_students:false,
  view_mothers:true,manage_mothers:false,
  view_schedules:true,manage_schedules:false,
  view_meetings:true,manage_meetings:false,
  view_attendance:true,manage_attendance:true,
  view_history:true,
  view_users:true,
  view_birthdays:true,
  view_calendar:true,manage_calendar:false,
  view_celebrations:true,manage_celebrations:false,
  view_academic_year:true
};

const PERMISSION_GROUPS:{title:string;view?:PermissionKey;manage?:PermissionKey}[]=[
  {title:'Painel',view:'view_home'},
  {title:'Alunos',view:'view_students',manage:'manage_students'},
  {title:'Mães auxiliares',view:'view_mothers',manage:'manage_mothers'},
  {title:'Escalas',view:'view_schedules',manage:'manage_schedules'},
  {title:'Reuniões',view:'view_meetings',manage:'manage_meetings'},
  {title:'Chamada',view:'view_attendance',manage:'manage_attendance'},
  {title:'Histórico de Aulas',view:'view_history'},
  {title:'Professores',view:'view_users'},
  {title:'Ano letivo',view:'view_academic_year'},
  {title:'Aniversariantes',view:'view_birthdays'},
  {title:'Calendário',view:'view_calendar',manage:'manage_calendar'},
  {title:'Datas Comemorativas',view:'view_celebrations',manage:'manage_celebrations'}
];

const normalizePermissions=(p:any):Record<string,boolean>=>({...DEFAULT_TEACHER_PERMISSIONS,...(p&&typeof p==='object'?p:{})});

type Data={students:Student[];users:UserRec[];mothers:Mother[];schedules:Schedule[];attendance:Attendance[];events:EventItem[];meetings:Meeting[];responses:Response[];notifications:Notice[];academicYears:AcademicYear[];settings:{name:string;subtitle:string;twoFactorIntervalValue:number;twoFactorIntervalUnit:'days'|'months'}};

const fmt=(d:string)=>d&&d.length>=10?d.slice(0,10).split('-').reverse().join('/'):'';
const dateOnly=(d:any)=>d?String(d).slice(0,10):'';
const formatMobileTime=(value:string)=>{const digits=value.replace(/\D/g,'').slice(0,4);if(digits.length<=2)return digits;return digits.slice(0,2)+':'+digits.slice(2)};
const validMobileTime=(value:string)=>!value||/^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const recordYear=(d:string)=>Number(String(d||'').slice(0,4));
const softDeleteRecord=async(table:string,id:string,label:string,reload:()=>Promise<void>,toast:(s:string)=>void)=>{if(!confirm(`Mover ${label} para a Lixeira? O registro poderá ser restaurado por 30 dias.`))return;const{error}=await supabase.from(table).update({deleted_at:new Date().toISOString()}).eq('id',id);if(error)return toast(error.message);await reload();toast('Registro movido para a Lixeira.');};
const empty:Data={students:[],users:[],mothers:[],schedules:[],attendance:[],events:[],meetings:[],responses:[],notifications:[],academicYears:[],settings:{name:'Evangelização Infanto Juvenil',subtitle:'Gestão e Coordenação',twoFactorIntervalValue:3,twoFactorIntervalUnit:'months'}};

async function loadAll():Promise<Data>{
  const [s,u,m,sc,a,e,me,r,n,ay,se]=await Promise.all([
    supabase.from('sabado_students').select('*').is('deleted_at',null).order('name'),
    supabase.from('sabado_users').select('*').is('deleted_at',null).order('name'),
    supabase.from('sabado_mothers').select('*').is('deleted_at',null).order('name'),
    supabase.from('sabado_schedules').select('*').is('deleted_at',null).order('date'),
    supabase.from('sabado_attendance').select('*').is('deleted_at',null).order('date',{ascending:false}),
    supabase.from('sabado_events').select('*').is('deleted_at',null).order('date'),
    supabase.from('sabado_meetings').select('*').is('deleted_at',null).order('date'),
    supabase.from('sabado_meeting_responses').select('*'),
    supabase.from('sabado_notifications').select('*').order('date',{ascending:false}),
    supabase.from('sabado_academic_years').select('*').order('year',{ascending:false}),
    supabase.from('sabado_settings').select('*').eq('id',1).maybeSingle()
  ]);
  const err=[s.error,u.error,m.error,sc.error,a.error,e.error,me.error,r.error,n.error,ay.error,se.error].find(Boolean);
  if(err) throw err;
  return {
    students:(s.data||[]).map((x:any)=>({id:x.id,name:x.name,birth:dateOnly(x.birth),group:x.group_name||'A definir',guardian:x.guardian||'',phone:x.phone||'',notes:x.notes||'',ageInfo:x.age_info||''})),
    users:(u.data||[]).map((x:any)=>({id:x.id,name:x.name,loginName:x.login_name||'',passwordCreated:x.password_created===true,twoFactorEnabled:x.two_factor_enabled===true,email:x.email||'',phone:x.phone||'',role:x.role||'Professor',group:x.group_name||'Geral',status:x.status||'Ativo',permissions:normalizePermissions(x.permissions)})),
    mothers:(m.data||[]).map((x:any)=>({id:x.id,name:x.name,phone:x.phone||'',email:x.email||'',notes:x.notes||'',active:x.active!==false,birth:dateOnly(x.birth),ageInfo:x.age_info||''})),
    schedules:(sc.data||[]).map((x:any)=>({id:x.id,date:dateOnly(x.date),adolescentTeacher:x.adolescent_teacher||'',youngerTeacher:x.younger_teacher||'',cleaningHelper:x.cleaning_helper||'',topic:x.topic||'',replacementReason:x.replacement_reason||''})),
    attendance:(a.data||[]).map((x:any)=>({id:x.id,date:dateOnly(x.date),teacher:x.teacher,group:x.group_name,entries:Array.isArray(x.entries)?x.entries:[]})),
    events:(e.data||[]).map((x:any)=>({id:x.id,title:x.title,date:dateOnly(x.date),type:x.type,time:x.time?String(x.time).slice(0,5):'',notes:x.notes||''})),
    meetings:(me.data||[]).map((x:any)=>({id:x.id,title:x.title,date:dateOnly(x.date),time:x.time?String(x.time).slice(0,5):'',location:x.location||'',notes:x.notes||''})),
    responses:(r.data||[]).map((x:any)=>({id:x.id,meetingId:x.meeting_id,userId:x.user_id,userName:x.user_name,status:x.status})),
    notifications:(n.data||[]).map((x:any)=>({id:x.id,title:x.title,body:x.body,date:x.date,kind:x.kind,meetingId:x.meeting_id||undefined})),
    academicYears:(ay.data||[]).map((x:any)=>({year:Number(x.year),status:x.status==='closed'?'closed':'open',closedAt:x.closed_at||'',closedBy:x.closed_by||undefined,snapshot:x.snapshot||{}})),
    settings:se.data?{name:se.data.name,subtitle:se.data.subtitle,twoFactorIntervalValue:Number(se.data.two_factor_interval_value||3),twoFactorIntervalUnit:se.data.two_factor_interval_unit==='days'?'days':'months'}:empty.settings
  };
}

function App(){
  const [data,setData]=useState<Data>(empty),[loading,setLoading]=useState(true),[authReady,setAuthReady]=useState(false),[page,setPage]=useState('home'),[menu,setMenu]=useState(false),[dark,setDark]=useState(()=>localStorage.getItem('theme')==='dark'),[msg,setMsg]=useState(''),[now,setNow]=useState(new Date()),[admin,setAdmin]=useState(false),[currentUser,setCurrentUser]=useState<UserRec|null>(null),[sessionEmail,setSessionEmail]=useState(''),[accessError,setAccessError]=useState(''),[noticeOpen,setNoticeOpen]=useState(false),[meetingNotice,setMeetingNotice]=useState<Meeting|null>(null),[rsvpUserId,setRsvpUserId]=useState('');
  const [read,setRead]=useState<string[]>([]),
        [hiddenNotices,setHiddenNotices]=useState<string[]>([]);
  const [selectedYear,setSelectedYear]=useState(()=>{const saved=Number(localStorage.getItem('sabado_academic_year')||0);return saved||new Date().getFullYear()});
  useEffect(()=>{localStorage.setItem('sabado_academic_year',String(selectedYear))},[selectedYear]);

  const reload=async()=>{try{setData(await loadAll())}catch(e:any){setMsg(e.message||'Erro ao carregar dados.')}finally{setLoading(false)}};

  const mapProfile=(x:any):UserRec=>({id:x.id,name:x.name,loginName:x.login_name||'',passwordCreated:x.password_created===true,twoFactorEnabled:x.two_factor_enabled===true,email:x.email||'',phone:x.phone||'',role:x.role||'Professor',group:x.group_name||'Geral',status:x.status||'Ativo',permissions:normalizePermissions(x.permissions)});

  const mapCustomProfile=(x:any):UserRec=>({
    id:x.id,name:x.name,loginName:x.login_name||'',passwordCreated:true,twoFactorEnabled:x.two_factor_enabled===true,email:'',phone:x.phone||'',
    role:x.role||'Professor',group:x.group_name||'Geral',status:x.status||'Ativo',
    permissions:normalizePermissions(x.permissions)
  });

  const hydrateCustomSession=async(token:string)=>{
    const{data,error}=await supabase.rpc('sabado_username_session',{p_token:token});
    if(error||!data){
      localStorage.removeItem(CUSTOM_SESSION_KEY);
      localStorage.removeItem(LOGIN_VALIDITY_KEY);
      setAdmin(false);setCurrentUser(null);setSessionEmail('');setData(empty);setLoading(false);setAuthReady(true);
      return;
    }
    const mapped=mapCustomProfile(data);
    const customAdmin=data.session_mode==='admin';
    setAdmin(customAdmin);
    setCurrentUser(customAdmin?{...mapped,role:'Administrador'}:mapped);
    setSessionEmail(mapped.loginName||mapped.name);setAccessError('');
    const expiresAt=new Date(data.expires_at).getTime();
    if(Number.isFinite(expiresAt))localStorage.setItem(LOGIN_VALIDITY_KEY,String(expiresAt));

    const trustedUntil=Number(localStorage.getItem(TRUSTED_2FA_UNTIL_KEY)||0);
    if(trustedUntil>0&&Date.now()>=trustedUntil){
      localStorage.removeItem(TRUSTED_2FA_DEVICE_KEY);
      localStorage.removeItem(TRUSTED_2FA_UNTIL_KEY);
    }

    if(!localStorage.getItem(TRUSTED_2FA_DEVICE_KEY)){
      try{
        const deviceInfo=getDeviceInfo();
        const{data:trusted}=await supabase.rpc('sabado_trust_current_device_v2',{
          p_token:token,
          p_device_name:deviceInfo.device_name,
          p_browser_name:deviceInfo.browser_name,
          p_platform_name:deviceInfo.platform_name
        });
        if(trusted?.ok&&trusted?.trusted_device_token){
          localStorage.setItem(TRUSTED_2FA_DEVICE_KEY,trusted.trusted_device_token);
          if(trusted.trusted_device_expires_at){
            localStorage.setItem(TRUSTED_2FA_UNTIL_KEY,String(new Date(trusted.trusted_device_expires_at).getTime()));
          }
        }
      }catch{}
    }

    await reload();
    setAuthReady(true);
  };

  const hydrateSession=async(session:any)=>{
    setAccessError('');
    const customToken=localStorage.getItem(CUSTOM_SESSION_KEY)||'';

    // Encerra qualquer sessão antiga do Supabase Auth para não existir um caminho sem 2 etapas.
    if(session){
      await supabase.auth.signOut();
    }

    if(customToken){
      await hydrateCustomSession(customToken);
      return;
    }

    setAdmin(false);setCurrentUser(null);setSessionEmail('');setData(empty);setLoading(false);setAuthReady(true);
  };

  useEffect(()=>{
    let mounted=true;
    supabase.auth.getSession().then(({data})=>{if(mounted)hydrateSession(data.session)});
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{if(mounted)hydrateSession(session)});
    const t=setInterval(()=>setNow(new Date()),1000);
    return()=>{mounted=false;clearInterval(t);subscription.unsubscribe()}
  },[]);

  useEffect(()=>{document.documentElement.classList.toggle('dark',dark);document.documentElement.setAttribute('data-theme',dark?'dark':'light');document.documentElement.style.colorScheme=dark?'dark':'light';localStorage.setItem('theme',dark?'dark':'light')},[dark]);
  useEffect(()=>{
    if(!currentUser?.id){setRead([]);setHiddenNotices([]);return;}
    let cancelled=false;
    const readKey=`readNotices:${currentUser.id}`;
    const hiddenKey=`hiddenNotices:${currentUser.id}`;
    let localRead:string[]=[];let localHidden:string[]=[];
    try{localRead=JSON.parse(localStorage.getItem(readKey)||'[]')}catch{}
    try{localHidden=JSON.parse(localStorage.getItem(hiddenKey)||'[]')}catch{}
    setRead(localRead);setHiddenNotices(localHidden);
    (async()=>{
      const{data:states,error}=await supabase.from('sabado_notification_states').select('notification_id,status').eq('user_id',currentUser.id);
      if(cancelled||error)return;
      const remoteRead=(states||[]).filter((x:any)=>x.status==='read'||x.status==='deleted').map((x:any)=>x.notification_id);
      const remoteHidden=(states||[]).filter((x:any)=>x.status==='deleted').map((x:any)=>x.notification_id);
      const mergedRead=[...new Set([...localRead,...remoteRead])];
      const mergedHidden=[...new Set([...localHidden,...remoteHidden])];
      setRead(mergedRead);setHiddenNotices(mergedHidden);
      localStorage.setItem(readKey,JSON.stringify(mergedRead));
      localStorage.setItem(hiddenKey,JSON.stringify(mergedHidden));
    })();
    return()=>{cancelled=true};
  },[currentUser?.id]);
  useEffect(()=>{
    if(!sessionEmail)return;
    const channel=supabase.channel('sabado-notifications-live').on('postgres_changes',{event:'INSERT',schema:'public',table:'sabado_notifications'},payload=>{
      const n=payload.new as any;
      setData(prev=>({...prev,notifications:[{id:n.id,title:n.title,body:n.body,date:n.date,kind:n.kind,meetingId:n.meeting_id||undefined},...prev.notifications.filter(x=>x.id!==n.id)]}));
      if('Notification' in window && Notification.permission==='granted'){
        try{new Notification(n.title,{body:n.body})}catch{}
      }
    }).subscribe();
    return()=>{supabase.removeChannel(channel)}
  },[sessionEmail]);
  useEffect(()=>{if(!msg)return;const t=setTimeout(()=>setMsg(''),2500);return()=>clearTimeout(t)},[msg]);
  useEffect(()=>{
    if(!sessionEmail)return;
    const t=setInterval(async()=>{
      if(!loginExpired())return;
      const token=localStorage.getItem(CUSTOM_SESSION_KEY);
      if(token)await supabase.rpc('sabado_username_logout',{p_token:token});
      localStorage.removeItem(CUSTOM_SESSION_KEY);
      localStorage.removeItem(LOGIN_VALIDITY_KEY);
      await supabase.auth.signOut();
      setAdmin(false);setCurrentUser(null);setSessionEmail('');setData(empty);setAuthReady(true);
    },60000);
    return()=>clearInterval(t);
  },[sessionEmail]);

  if(!authReady)return <div className="loading">Verificando acesso...</div>;

  if(!sessionEmail){
    return <LoginPage adminOnly={false} onSuccess={hydrateSession}/>;
  }

  if(accessError){
    return <AccessBlocked message={accessError} email={sessionEmail}/>;
  }

  if(window.location.pathname==='/admin'&&!admin){
    return <AccessBlocked message="Esta área é exclusiva do Administrador." email={sessionEmail}/>;
  }

  if(loading)return <div className="loading">Carregando Evangelização Infanto Juvenil...</div>;

  const permissions=currentUser?.permissions||DEFAULT_TEACHER_PERMISSIONS;
  const can=(key:PermissionKey)=>admin||permissions[key]===true;
  const ownerOnly=admin&&((currentUser?.loginName||'').toLowerCase()==='andrey'||sessionEmail.toLowerCase()===ADMIN_EMAIL);

  const navConfig=[
    ['Painel','home',Users,'view_home'],
    ['Alunos','students',Users,'view_students'],
    ['Mães','mothers',Heart,'view_mothers'],
    ['Escalas','schedules',BookOpen,'view_schedules'],
    ['Reuniões','meetings',CalendarDays,'view_meetings'],
    ['Chamada','attendance',ClipboardCheck,'view_attendance'],
    ['Histórico de Aulas','history',History,'view_history'],
    ['Professores','users',UserCog,'view_users'],
    ['Aniversariantes do Mês','birthdays',Cake,'view_birthdays'],
    ['Calendário','calendar',CalendarDays,'view_calendar'],
    ['Datas Comemorativas','celebrations',PartyPopper,'view_celebrations'],
    ['Ano letivo','academic-year',CalendarDays,'view_academic_year']
  ] as const;
  const nav=navConfig.filter(([, , ,perm])=>can(perm as PermissionKey));
  const personal=[['Minha Segurança','security',ShieldCheck]] as const;
  const extra=admin?[['Lixeira','trash',Trash2],['Auditoria','audit',History],...(ownerOnly?[['Central do Sistema','system-center',Activity] as const]:[]),['Configurações','settings',Settings],['Administração','admin',UserCog]] as const:[];

  // Mostra somente notificações realmente novas. As que foram lidas ou excluídas permanecem ocultas após recarregar a página.
  const visibleNotifications=data.notifications.filter(n=>!hiddenNotices.includes(n.id)&&!read.includes(n.id));
  const unread=visibleNotifications.length;
  const toast=(s:string)=>setMsg(s);
  const noticeReadKey=currentUser?.id?`readNotices:${currentUser.id}`:'readNotices';
  const noticeHiddenKey=currentUser?.id?`hiddenNotices:${currentUser.id}`:'hiddenNotices';

  const enableDeviceNotifications=async()=>{
    if(!('Notification' in window))return toast('Este navegador não oferece notificações do dispositivo.');
    const permission=await Notification.requestPermission();
    toast(permission==='granted'?'Notificações do dispositivo ativadas.':'Permissão de notificações não concedida.');
  };
  const persistNoticeState=async(id:string,status:'read'|'deleted')=>{
    if(!currentUser?.id)return;
    const{error}=await supabase.from('sabado_notification_states').upsert({user_id:currentUser.id,notification_id:id,status,updated_at:new Date().toISOString()},{onConflict:'user_id,notification_id'});
    if(error)console.warn('Não foi possível sincronizar o estado da notificação:',error.message);
  };
  const markNoticeRead=async(id:string)=>{
    const next=[...new Set([...read,id])];
    setRead(next);
    localStorage.setItem(noticeReadKey,JSON.stringify(next));
    await persistNoticeState(id,'read');
    toast('Notificação marcada como lida.');
  };
  const deleteNotice=async(id:string)=>{
    const hidden=[...new Set([...hiddenNotices,id])];
    const readNext=[...new Set([...read,id])];
    setHiddenNotices(hidden);
    setRead(readNext);
    localStorage.setItem(noticeHiddenKey,JSON.stringify(hidden));
    localStorage.setItem(noticeReadKey,JSON.stringify(readNext));
    await persistNoticeState(id,'deleted');
    toast('Notificação excluída. Ela não será exibida novamente.');
  };
  const clearNotices=async()=>{
    if(!visibleNotifications.length||!confirm('Excluir todas as notificações exibidas?'))return;
    const ids=visibleNotifications.map(n=>n.id);
    const hidden=[...new Set([...hiddenNotices,...ids])];
    const readNext=[...new Set([...read,...ids])];
    setHiddenNotices(hidden);
    setRead(readNext);
    localStorage.setItem(noticeHiddenKey,JSON.stringify(hidden));
    localStorage.setItem(noticeReadKey,JSON.stringify(readNext));
    await Promise.all(ids.map(id=>persistNoticeState(id,'deleted')));
    toast('Notificações excluídas. Somente novas notificações serão exibidas.');
  };

  const respond=async(status:'yes'|'no')=>{
    if(!meetingNotice)return;
    let u:UserRec|undefined;
    if(admin){
      if(!rsvpUserId)return toast('Selecione o nome.');
      u=data.users.find(x=>x.id===rsvpUserId);
    }else{
      u=currentUser||undefined;
    }
    if(!u||!u.id)return toast('Não foi possível identificar o usuário.');
    const old=data.responses.find(x=>x.meetingId===meetingNotice.id&&x.userId===u!.id);
    const payload={meeting_id:meetingNotice.id,user_id:u.id,user_name:u.name,status,updated_at:new Date().toISOString()};
    const q=old?supabase.from('sabado_meeting_responses').update(payload).eq('id',old.id):supabase.from('sabado_meeting_responses').insert(payload);
    const {error}=await q;if(error)return toast(error.message);
    setMeetingNotice(null);setRsvpUserId('');await reload();toast(status==='yes'?'Participação confirmada.':'Ausência informada.');
  };

  const currentYear=new Date().getFullYear();
  const academicYears=[...new Set([2026,currentYear,currentYear+1,currentYear+2,currentYear+3,currentYear+4,...data.academicYears.map(x=>x.year),...data.attendance.map(x=>Number(x.date.slice(0,4))),...data.events.map(x=>Number(x.date.slice(0,4))),...data.schedules.map(x=>Number(x.date.slice(0,4))),...data.meetings.map(x=>Number(x.date.slice(0,4)))])].filter(Boolean).sort((a,b)=>a-b);
  const selectedYearClosed=data.academicYears.some(x=>x.year===selectedYear&&x.status==='closed');

  const content=
    page==='home'&&can('view_home')?<Dashboard data={data} selectedYear={selectedYear}/>:
    page==='students'&&can('view_students')?<Students data={data} admin={can('manage_students')} reload={reload} toast={toast}/>:
    page==='mothers'&&can('view_mothers')?<Mothers data={data} admin={can('manage_mothers')} reload={reload} toast={toast}/>:
    page==='schedules'&&can('view_schedules')?<Schedules data={data} admin={can('manage_schedules')} reload={reload} toast={toast} selectedYear={selectedYear} closed={selectedYearClosed}/>:
    page==='meetings'&&can('view_meetings')?<Meetings data={data} admin={can('manage_meetings')} reload={reload} toast={toast} setMeeting={setMeetingNotice} selectedYear={selectedYear} closed={selectedYearClosed}/>:
    page==='attendance'&&can('view_attendance')?<AttendancePage data={data} admin={can('manage_attendance')} reload={reload} toast={toast} selectedYear={selectedYear} closed={selectedYearClosed}/>:
    page==='history'&&can('view_history')?<HistoryPage data={data} admin={can('manage_attendance')} reload={reload} toast={toast} selectedYear={selectedYear}/>:
    page==='birthdays'&&can('view_birthdays')?<Birthdays data={data}/>:
    page==='calendar'&&can('view_calendar')?<Calendar data={data} admin={can('manage_calendar')} reload={reload} toast={toast} selectedYear={selectedYear} closed={selectedYearClosed}/>:
    page==='celebrations'&&can('view_celebrations')?<Celebrations data={data} admin={can('manage_celebrations')} reload={reload} toast={toast} selectedYear={selectedYear} closed={selectedYearClosed}/>:
    page==='users'&&can('view_users')?<UsersPage data={data} admin={admin} reload={reload} toast={toast}/>:
    page==='security'?<MySecurityPage currentUser={currentUser} toast={toast}/>:
    page==='academic-year'&&can('view_academic_year')?<AcademicYearPage data={data} selectedYear={selectedYear} setSelectedYear={setSelectedYear} reload={reload} toast={toast} admin={admin}/>:
    page==='trash'&&admin?<TrashPage data={data} reload={reload} toast={toast}/>:
    page==='audit'&&admin?<AuditPage/>:
    page==='system-center'&&ownerOnly?<SystemCenterPage/>:
    page==='settings'&&admin?<SettingsPage data={data} reload={reload} toast={toast}/>:
    page==='admin'&&admin?<AdminPage data={data} setPage={setPage} selectedYear={selectedYear}/>:
    can('view_home')?<Dashboard data={data} selectedYear={selectedYear}/>:<div className="panel"><Title t="Acesso liberado" s="Use o menu para acessar as áreas permitidas pelo administrador."/></div>;

  const doSignOut=async()=>{const token=localStorage.getItem(CUSTOM_SESSION_KEY);if(token)await supabase.rpc('sabado_username_logout',{p_token:token});localStorage.removeItem(CUSTOM_SESSION_KEY);localStorage.removeItem(LOGIN_VALIDITY_KEY);await supabase.auth.signOut();setAdmin(false);setCurrentUser(null);setSessionEmail('');setData(empty);setPage('home')};

  return <div className="shell"><aside className={menu?'side open':'side'}><div className="brand"><div className="brand-logo"><BookOpen size={26}/><span className="brand-heart">♥</span></div><div className="brand-copy"><b className="brand-title"><span>Evangelização</span><span>Infanto Juvenil</span></b><span>Gestão e Coordenação</span></div></div><button className="close" onClick={()=>setMenu(false)}><X/></button>{[...nav,...personal,...extra].map(([label,key,I])=><button key={key} className={page===key?'nav active':'nav'} onClick={()=>{setPage(key);setMenu(false)}}><I size={18}/>{label}</button>)}<div className="user-session-card"><ShieldCheck size={16}/><div><b>{currentUser?.name||sessionEmail}</b><small>{admin?'Administrador':'Professor'}</small></div></div></aside><main><header><button className="hamb" onClick={()=>setMenu(true)}><Menu/></button><div className="clock"><b>{now.toLocaleTimeString('pt-BR')}</b><span>{now.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}</span></div><div className="top"><div className="academic-year-picker"><span>Ano letivo</span><select value={selectedYear} onChange={e=>setSelectedYear(Number(e.target.value))}>{academicYears.map(y=><option key={y} value={y}>{y}{data.academicYears.some(x=>x.year===y&&x.status==='closed')?' · encerrado':''}</option>)}</select></div><button className="top-icon-btn theme-toggle" title={dark?'Usar tema claro':'Usar tema cinza escuro'} onClick={()=>setDark(!dark)}>{dark?<Sun/>:<Moon/>}</button><button className="notice-button top-icon-btn" title="Notificações" onClick={()=>setNoticeOpen(!noticeOpen)}><Bell/>{unread>0&&<span className="badge">{unread}</span>}</button><button className="ghost-btn" onClick={doSignOut}>Sair</button></div></header>
  {noticeOpen&&<div className="notice-panel"><div className="notice-head"><b>Notificações novas</b><div className="notice-tools"><button className="read-all" onClick={async()=>{const ids=visibleNotifications.map(n=>n.id);const next=[...new Set([...read,...ids])];setRead(next);localStorage.setItem(noticeReadKey,JSON.stringify(next));await Promise.all(ids.map(id=>persistNoticeState(id,'read')));toast(ids.length?'Todas foram marcadas como lidas.':'Nenhuma notificação nova.')}}>✓ Marcar todas como lidas</button><button className="read-all" onClick={enableDeviceNotifications}>🔔 Ativar no dispositivo</button>{visibleNotifications.length>0&&<button className="delete-notifications-btn" onClick={clearNotices}><Trash2 size={15}/> Excluir notificações</button>}<button className="icon-close" onClick={()=>setNoticeOpen(false)}><X size={18}/></button></div></div>{visibleNotifications.map(n=><div className="notice-item" key={n.id}><div className="notice-item-head"><b>{n.title}</b><div className="notice-item-actions"><button className="notice-read" title="Marcar como lida" onClick={()=>markNoticeRead(n.id)}>✓</button><button className="notice-delete" title="Excluir esta notificação" onClick={()=>deleteNotice(n.id)}><Trash2 size={15}/></button></div></div><span>{n.body}</span><small>{new Date(n.date).toLocaleString('pt-BR')}</small>{n.kind==='meeting'&&n.meetingId&&<button className="notice-action" onClick={()=>{const m=data.meetings.find(x=>x.id===n.meetingId);if(m){setMeetingNotice(m);setNoticeOpen(false)}}}>Responder à reunião</button>}</div>)}{!visibleNotifications.length&&<Empty text="Nenhuma notificação nova."/>}</div>}
  {meetingNotice&&<Modal title="Confirmar participação" close={()=>setMeetingNotice(null)}>{admin?<><label>Responder como</label><select value={rsvpUserId} onChange={e=>setRsvpUserId(e.target.value)}><option value="">Selecione o nome</option>{data.users.filter(u=>['Professor','Administrador'].includes(u.role)&&u.status!=='Inativo').sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')).map(u=><option value={u.id} key={u.id}>{u.name}</option>)}</select></>:<div className="logged-response"><ShieldCheck size={18}/><span>Respondendo como <b>{currentUser?.name}</b></span></div>}<div className="rsvp-buttons"><button className="yes-rsvp" onClick={()=>respond('yes')}>✅ Vou participar</button><button className="no-rsvp" onClick={()=>respond('no')}>❌ Não poderei participar</button></div></Modal>}
  {msg&&<div className="toast">{msg}</div>}<section className="content">{content}</section><footer>© 2026 Evangelização Infanto Juvenil · Todos os direitos reservados.</footer></main></div>
}

function LoginPage({adminOnly:_adminOnly,onSuccess:_onSuccess}:{adminOnly:boolean;onSuccess:(session:any)=>Promise<void>}){
  const[identity,setIdentity]=useState(''),[password,setPassword]=useState(''),[confirmPassword,setConfirmPassword]=useState(''),[mode,setMode]=useState<'login'|'signup'>('login'),[msg,setMsg]=useState(''),[pending,setPending]=useState(false),[roleChoice,setRoleChoice]=useState<any>(null),[showPassword,setShowPassword]=useState(false),[showConfirmPassword,setShowConfirmPassword]=useState(false),[twoFactor,setTwoFactor]=useState<any>(null),[twoFactorCode,setTwoFactorCode]=useState('');

  const finishCustomLogin=(data:any)=>{
    localStorage.setItem(CUSTOM_SESSION_KEY,data.token);
    localStorage.setItem(LOGIN_VALIDITY_KEY,String(new Date(data.expires_at).getTime()));

    if(data?.trusted_device_token){
      localStorage.setItem(TRUSTED_2FA_DEVICE_KEY,data.trusted_device_token);
    }
    const trustedUntilValue=data?.trusted_device_expires_at||data?.trusted_until;
    if(trustedUntilValue){
      localStorage.setItem(TRUSTED_2FA_UNTIL_KEY,String(new Date(trustedUntilValue).getTime()));
    }

    window.location.href='/';
  };

  const chooseRole=async(accessMode:'professor'|'admin')=>{
    if(!roleChoice?.token)return;
    setPending(true);setMsg('');
    try{
      const{data,error}=await supabase.rpc('sabado_username_select_mode',{p_token:roleChoice.token,p_mode:accessMode});
      if(error)return setMsg(error.message||'Não foi possível selecionar o tipo de acesso.');
      if(!data?.ok)return setMsg(data?.error||'Não foi possível selecionar o tipo de acesso.');
      finishCustomLogin(roleChoice);
    }catch(e:any){setMsg(e.message||'Não foi possível concluir o acesso.')}
    finally{setPending(false)}
  };

  const verifyTwoFactor=async()=>{
    if(!twoFactor?.challenge_token)return;
    const code=twoFactorCode.replace(/\D/g,'');
    if(!/^\d{6}$/.test(code))return setMsg('Informe o código de 6 números do aplicativo autenticador.');
    setPending(true);setMsg('');
    try{
      const deviceInfo=getDeviceInfo();
      const{data,error}=await supabase.rpc('sabado_username_2fa_verify_v2',{
        p_challenge:twoFactor.challenge_token,
        p_code:code,
        p_device_name:deviceInfo.device_name,
        p_browser_name:deviceInfo.browser_name,
        p_platform_name:deviceInfo.platform_name
      });
      if(error)return setMsg(error.message||'Não foi possível validar o código.');
      if(!data?.ok)return setMsg(data?.error||'Código inválido.');

      setTwoFactor(null);
      setTwoFactorCode('');
      if(data?.can_choose_admin===true){
        setRoleChoice(data);
        return;
      }
      finishCustomLogin(data);
    }catch(e:any){setMsg(e.message||'Não foi possível validar a verificação em duas etapas.')}
    finally{setPending(false)}
  };

  const copySecret=async()=>{
    if(!twoFactor?.totp_secret)return;
    try{
      await navigator.clipboard.writeText(twoFactor.totp_secret);
      setMsg('Chave copiada.');
    }catch{
      setMsg('Não foi possível copiar automaticamente. Selecione a chave abaixo.');
    }
  };

  const go=async()=>{
    setMsg('');
    const clean=identity.trim();
    if(!clean)return setMsg('Informe o usuário.');
    if(mode==='signup'&&password.length<6)return setMsg('A senha deve conter pelo menos 6 caracteres.');
    if(mode==='login'&&password.length<6)return setMsg('Informe a sua senha.');
    if(mode==='signup'&&password!==confirmPassword)return setMsg('As senhas não conferem.');
    setPending(true);
    try{
      let trustedDeviceToken=localStorage.getItem(TRUSTED_2FA_DEVICE_KEY)||'';
      const trustedUntil=Number(localStorage.getItem(TRUSTED_2FA_UNTIL_KEY)||0);
      if(trustedUntil>0&&Date.now()>=trustedUntil){
        localStorage.removeItem(TRUSTED_2FA_DEVICE_KEY);
        localStorage.removeItem(TRUSTED_2FA_UNTIL_KEY);
        trustedDeviceToken='';
      }

      const deviceInfo=getDeviceInfo();
      const{data,error}=mode==='signup'
        ?await supabase.rpc('sabado_username_register',{p_username:clean,p_password:password})
        :await supabase.rpc('sabado_username_login_v3',{
          p_username:clean,
          p_password:password,
          p_device_token:trustedDeviceToken,
          p_device_name:deviceInfo.device_name,
          p_browser_name:deviceInfo.browser_name,
          p_platform_name:deviceInfo.platform_name
        });
      if(error)return setMsg(error.message||'Não foi possível concluir o acesso.');
      if(data?.error)return setMsg(data.error);

      if(mode==='signup'){
        if(!data?.created)return setMsg('Não foi possível criar a senha.');
        setPassword('');
        setConfirmPassword('');
        setMode('login');
        setMsg('Senha criada com sucesso. Agora informe a senha para configurar a verificação em duas etapas.');
        return;
      }

      if(data?.token){
        if(data?.can_choose_admin===true){
          setRoleChoice(data);
          return;
        }
        finishCustomLogin(data);
        return;
      }

      if(data?.two_factor_required===true&&data?.challenge_token){
        setPassword('');
        setTwoFactor(data);
        setTwoFactorCode('');
        return;
      }

      setMsg('Não foi possível iniciar o acesso.');
    }catch(e:any){setMsg(e.message||'Não foi possível concluir o acesso.')}
    finally{setPending(false)}
  };

  if(twoFactor){
    const issuer='Evangelização Infanto Juvenil';
    const account=twoFactor.account_name||identity.trim()||'Usuário';
    const secret=twoFactor.totp_secret||'';
    const uri=twoFactor.setup_required
      ?`otpauth://totp/${encodeURIComponent(issuer+':'+account)}?secret=${encodeURIComponent(secret)}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`
      :'';

    return <div className="login-page"><div className="login-card teacher-login two-factor-card">
      <div className="login-brand"><div className="brand-logo"><ShieldCheck size={28}/><span className="brand-heart">♥</span></div><div><b>Evangelização Infanto Juvenil</b><span>Segurança em duas etapas</span></div></div>
      <h1>{twoFactor.setup_required?'Ativar verificação em duas etapas':'Código de verificação'}</h1>
      {twoFactor.setup_required?<>
        <p className="login-subtitle">Para proteger sua conta, configure um aplicativo autenticador. Essa etapa é obrigatória antes de entrar no sistema.</p>
        <div className="two-factor-setup">
          <div className="two-factor-step"><span>1</span><div><b>Abra um aplicativo autenticador</b><small>Google Authenticator, Microsoft Authenticator, Authy ou outro aplicativo TOTP.</small></div></div>
          <div className="two-factor-qr"><QRCodeSVG value={uri} size={188} level="M" includeMargin/></div>
          <div className="two-factor-step"><span>2</span><div><b>Escaneie o QR Code</b><small>Se preferir, cadastre manualmente usando a chave abaixo.</small></div></div>
          <div className="two-factor-secret"><code>{secret.match(/.{1,4}/g)?.join(' ')||secret}</code><button type="button" onClick={copySecret} title="Copiar chave"><Copy size={16}/></button></div>
          <div className="two-factor-step"><span>3</span><div><b>Digite o código de 6 números</b><small>O código muda aproximadamente a cada 30 segundos.</small></div></div>
        </div>
      </>:<>
        <p className="login-subtitle">Abra seu aplicativo autenticador e informe o código atual. Depois de validar, este navegador ficará autorizado pelo período configurado em Minha Segurança.</p>
        <div className="two-factor-verified-icon"><Smartphone size={34}/><ShieldCheck size={22}/></div>
      </>}
      <input className="two-factor-code" value={twoFactorCode} onChange={e=>setTwoFactorCode(e.target.value.replace(/\D/g,'').slice(0,6))} onKeyDown={e=>{if(e.key==='Enter')verifyTwoFactor()}} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000"/>
      <button className="primary login-main-button" disabled={pending} onClick={verifyTwoFactor}><ShieldCheck size={18}/>{pending?'Verificando...':twoFactor.setup_required?'Ativar e entrar':'Verificar e entrar'}</button>
      <button className="link-btn" disabled={pending} onClick={()=>{setTwoFactor(null);setTwoFactorCode('');setMsg('')}}>Voltar para o login</button>
      {msg&&<small className="login-message">{msg}</small>}
    </div></div>
  }

  return <div className="login-page"><div className="login-card teacher-login"><div className="login-brand"><div className="brand-logo"><BookOpen size={28}/><span className="brand-heart">♥</span></div><div><b>Evangelização Infanto Juvenil</b><span>Gestão e Coordenação</span></div></div><h1>{mode==='login'?'Entrar no sistema':'Criar minha senha'}</h1>{mode==='signup'&&<p className="login-subtitle">No primeiro acesso, informe o seu usuário e crie uma senha com pelo menos 6 caracteres.</p>}<input value={identity} onChange={e=>setIdentity(e.target.value)} type="text" autoCapitalize="none" autoComplete="username" placeholder="Usuário — ex.: Fernanda"/><div className="password-field"><input value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')go()}} type={showPassword?'text':'password'} autoComplete={mode==='login'?'current-password':'new-password'} placeholder={mode==='login'?'Senha':'Crie uma senha'}/><button type="button" className="password-toggle" aria-label={showPassword?'Ocultar senha':'Mostrar senha'} title={showPassword?'Ocultar senha':'Mostrar senha'} onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>{mode==='signup'&&<div className="password-field"><input value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} type={showConfirmPassword?'text':'password'} autoComplete="new-password" placeholder="Confirmar senha"/><button type="button" className="password-toggle" aria-label={showConfirmPassword?'Ocultar senha':'Mostrar senha'} title={showConfirmPassword?'Ocultar senha':'Mostrar senha'} onClick={()=>setShowConfirmPassword(v=>!v)}>{showConfirmPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>}<button className="primary login-main-button" disabled={pending} onClick={go}>{pending?'Aguarde...':mode==='login'?<><LogIn size={18}/> Entrar</>:<><KeyRound size={18}/> Criar senha</>}</button><button className="link-btn" disabled={pending} onClick={()=>{setMode(mode==='login'?'signup':'login');setPassword('');setConfirmPassword('');setShowPassword(false);setShowConfirmPassword(false);setMsg('')}}>{mode==='login'?'Primeiro acesso? Criar senha':'Já criei minha senha'}</button>{msg&&<small className="login-message">{msg}</small>}</div>{roleChoice&&<Modal title="Como deseja entrar?" close={()=>setRoleChoice(null)}><p className="role-choice-text">Seu usuário <b>Andrey</b> possui dois tipos de acesso. Escolha como deseja entrar agora:</p><div className="role-choice-buttons"><button className="role-choice professor" disabled={pending} onClick={()=>chooseRole('professor')}><Users size={22}/><span><b>Professor</b><small>Acesso conforme as permissões de professor</small></span></button><button className="role-choice admin" disabled={pending} onClick={()=>chooseRole('admin')}><ShieldCheck size={22}/><span><b>Administrador</b><small>Acesso completo ao sistema</small></span></button></div></Modal>}</div>
}

function AccessBlocked({message,email}:{message:string;email:string}){
  return <div className="login-page"><div className="login-card access-blocked"><ShieldCheck size={42}/><h1>Acesso não liberado</h1><p>{message}</p>{email&&<small>{email}</small>}<button className="primary" onClick={async()=>{const token=localStorage.getItem(CUSTOM_SESSION_KEY);if(token)await supabase.rpc('sabado_username_logout',{p_token:token});localStorage.removeItem(CUSTOM_SESSION_KEY);localStorage.removeItem(LOGIN_VALIDITY_KEY);await supabase.auth.signOut();window.location.href='/'}}>Voltar ao login</button></div></div>
}

function Dashboard({data,selectedYear}:{data:Data;selectedYear:number}){
  const today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});
  const yearAttendance=data.attendance.filter(a=>recordYear(a.date)===selectedYear);
  const pres=yearAttendance.reduce((sum,a)=>sum+a.entries.filter(e=>e.present).length,0);
  const monthNames=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const monthly=monthNames.map((label,i)=>({label,present:yearAttendance.filter(a=>Number(a.date.slice(5,7))===i+1).reduce((sum,a)=>sum+a.entries.filter(e=>e.present).length,0)}));
  const maxMonthly=Math.max(1,...monthly.map(m=>m.present));
  const groups={menores:data.students.filter(s=>s.group==='Menores').length,adolescentes:data.students.filter(s=>s.group==='Adolescentes').length,definir:data.students.filter(s=>!s.group||s.group==='A definir').length};
  const total=Math.max(1,data.students.length),menorPct=Math.round(groups.menores/total*100),adPct=Math.round(groups.adolescentes/total*100);
  const yearly:Record<string,number>={};
  yearAttendance.forEach(a=>a.entries.forEach(e=>{if(e.present)yearly[e.studentId]=(yearly[e.studentId]||0)+1}));
  const ranking=data.students.map(s=>({name:s.name,count:yearly[s.id]||0})).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'pt-BR')).slice(0,5);
  const rankMax=Math.max(1,...ranking.map(r=>r.count));
  const iso=(y:number,m:number,d:number)=>`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const lastSat=(y:number,m:number)=>{const dt=new Date(Date.UTC(y,m,0));return iso(y,m,dt.getUTCDate()-((dt.getUTCDay()-6+7)%7))};
  const items:any[]=data.events.filter(e=>recordYear(e.date)===selectedYear).map(e=>({key:e.id,title:e.type==='Festa'?'🎉 '+e.title:e.title,date:e.date,type:e.type==='Festa'?'Data comemorativa':e.type,detail:e.notes,time:e.time}));
  for(let m=1;m<=12;m++){const names=data.students.filter(s=>s.birth&&Number(s.birth.slice(5,7))===m).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')).map(s=>s.name);if(names.length)items.push({key:`b-${selectedYear}-${m}`,title:`🎂 Aniversariantes de ${months[m-1]}`,date:lastSat(selectedYear,m),type:'Último sábado do mês',detail:names.join(', ')})}
  const seen=new Set<string>();
  const up=items.filter(i=>recordYear(i.date)===selectedYear&&(selectedYear!==new Date().getFullYear()||i.date>=today)).sort((a,b)=>a.date.localeCompare(b.date)).filter(i=>{const k=i.date+'|'+i.title;if(seen.has(k))return false;seen.add(k);return true});
  const closed=data.academicYears.some(x=>x.year===selectedYear&&x.status==='closed');
  return <>
    <div className="hero"><p>Visão geral · Ano letivo {selectedYear}</p><h1>Gestão de sábado, simples e organizada.</h1><span>Acompanhe alunos, chamadas, professores, eventos e aniversários em um só lugar.</span>{closed&&<strong className="closed-year-badge">🔒 Ano encerrado — dados congelados</strong>}</div>
    <div className="grid"><Card t="Alunos" v={data.students.length}/><Card t="Professores e admins" v={data.users.length}/><Card t={`Aulas registradas em ${selectedYear}`} v={yearAttendance.length}/><Card t={`Presenças em ${selectedYear}`} v={pres}/></div>
    <h2>Gráficos de {selectedYear}</h2>
    <div className="dashboard-charts">
      <div className="chart-card"><div className="chart-title"><b>Presenças por mês</b><small>{selectedYear}</small></div><div className="bar-chart">{monthly.map(m=><div className="bar-col" key={m.label}><div className="bar-value">{m.present}</div><div className="bar-track"><div className="bar-fill" style={{height:Math.max(4,m.present/maxMonthly*100)+'%'}}/></div><small>{m.label}</small></div>)}</div></div>
      <div className="chart-card"><div className="chart-title"><b>Alunos por turma</b><small>Total atual: {data.students.length}</small></div><div className="group-chart"><div className="donut" style={{background:`conic-gradient(#2864dc 0 ${menorPct}%, #6ea0ff ${menorPct}% ${menorPct+adPct}%, #cbd5e1 ${menorPct+adPct}% 100%)`}}><div><strong>{data.students.length}</strong><small>alunos</small></div></div><div className="chart-legend"><span><i className="dot menores"/>Menores <b>{groups.menores}</b></span><span><i className="dot adolescentes"/>Adolescentes <b>{groups.adolescentes}</b></span><span><i className="dot definir"/>A definir <b>{groups.definir}</b></span></div></div></div>
      <div className="chart-card chart-wide"><div className="chart-title"><b>Top 5 presenças</b><small>{selectedYear}</small></div><div className="ranking-chart">{ranking.map((r,i)=><div className="rank-row" key={r.name}><span className="rank-pos">{i+1}</span><span className="rank-name">{r.name}</span><div className="rank-track"><div className="rank-fill" style={{width:(r.count/rankMax*100)+'%'}}/></div><b>{r.count}</b></div>)}</div></div>
    </div>
    <h2>Eventos de {selectedYear}</h2><div className="panel">{up.map(i=><div className="row" key={i.key}><div><b>{i.title}</b><small>{i.type}{i.detail?' · '+i.detail:''}</small></div><span>{fmt(i.date)} {i.time||''}</span></div>)}{!up.length&&<Empty text={`Nenhum evento em ${selectedYear}.`}/>}</div>
  </>
}

function Students({data,admin,reload,toast}:{data:Data;admin:boolean;reload:()=>Promise<void>;toast:(s:string)=>void}){
  const blank={name:'',birth:'',group:'A definir',guardian:'',phone:'',notes:'',ageInfo:''};const[f,setF]=useState(blank),[edit,setEdit]=useState<Student|null>(null);
  const save=async()=>{if(!f.name.trim())return toast('Informe o nome do aluno.');const{error}=await supabase.from('sabado_students').insert({name:f.name,birth:f.birth||null,group_name:f.group,guardian:f.guardian,phone:f.phone,notes:f.notes,age_info:f.ageInfo});if(error)return toast(error.message);setF(blank);await reload();toast('Aluno salvo.')};
  const update=async()=>{if(!edit)return;const{error}=await supabase.from('sabado_students').update({name:edit.name,birth:edit.birth||null,group_name:edit.group,guardian:edit.guardian,phone:edit.phone,notes:edit.notes,age_info:edit.ageInfo}).eq('id',edit.id);if(error)return toast(error.message);setEdit(null);await reload();toast('Aluno alterado.')};
  const del=async(s:Student)=>softDeleteRecord('sabado_students',s.id,`o aluno ${s.name}`,reload,toast);
  const pdf=()=>{const w=window.open('','_blank');if(!w)return;const rows=[...data.students].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')).map((s,i)=>`<tr><td>${i+1}</td><td>${s.name}</td><td>${s.group}</td><td>${s.birth?fmt(s.birth):'-'}</td><td>${s.ageInfo||'-'}</td><td>${s.guardian||'-'}</td><td>${s.phone||'-'}</td></tr>`).join('');w.document.write(`<html><style>@page{size:A4 landscape}body{font-family:Arial}table{width:100%;border-collapse:collapse}td,th{border:1px solid #aaa;padding:5px;font-size:10px}</style><body><h2>Lista de Alunos</h2><p>Total: ${data.students.length}</p><table><tr><th>#</th><th>Nome</th><th>Turma</th><th>Nascimento</th><th>Idade</th><th>Responsável</th><th>Telefone</th></tr>${rows}</table><script>print()</script></body></html>`);w.document.close()};
  return <><div className="section-head"><Title t="Alunos" s={admin?"Cadastre e mantenha os dados dos alunos salvos.":"Consulta de alunos liberada pelo administrador."}/><button className="primary pdf-button" onClick={pdf}><Save size={17}/> Salvar lista em PDF</button></div>
  {admin&&<div className="panel form data-form"><h3><Plus size={18}/> Novo aluno</h3><input placeholder="Nome completo *" value={f.name} onChange={e=>setF({...f,name:e.target.value})}/><input type="date" value={f.birth} onChange={e=>setF({...f,birth:e.target.value})}/><input placeholder="Idade (ex.: 12 anos)" value={f.ageInfo} onChange={e=>setF({...f,ageInfo:e.target.value})}/><select value={f.group} onChange={e=>setF({...f,group:e.target.value})}><option>A definir</option><option>Menores</option><option>Adolescentes</option></select><input placeholder="Responsável" value={f.guardian} onChange={e=>setF({...f,guardian:e.target.value})}/><input placeholder="Telefone / WhatsApp" value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/><input placeholder="Informações importantes" value={f.notes} onChange={e=>setF({...f,notes:e.target.value})}/><button className="primary" onClick={save}><Save size={17}/> Salvar aluno</button></div>}
  <div className="cards">{data.students.map(s=><div className="person" key={s.id}><div className="avatar">{s.name[0]}</div><div><b>{s.name}</b><small>{s.group} · {s.birth?fmt(s.birth):'Nascimento não informado'} · {s.ageInfo||'Idade não informada'}</small><small>{s.guardian||'Responsável não informado'}</small></div>{admin&&<div className="record-actions"><button className="edit-icon" onClick={()=>setEdit({...s})}><Pencil size={16}/></button><button className="danger-icon" onClick={()=>del(s)}><Trash2 size={16}/></button></div>}</div>)}</div>
  {admin&&edit&&<Modal title="Alterar aluno" close={()=>setEdit(null)}><input value={edit.name} onChange={e=>setEdit({...edit,name:e.target.value})}/><input type="date" value={edit.birth} onChange={e=>setEdit({...edit,birth:e.target.value})}/><input value={edit.ageInfo} placeholder="Idade" onChange={e=>setEdit({...edit,ageInfo:e.target.value})}/><select value={edit.group} onChange={e=>setEdit({...edit,group:e.target.value})}><option>A definir</option><option>Menores</option><option>Adolescentes</option></select><input value={edit.guardian} placeholder="Responsável" onChange={e=>setEdit({...edit,guardian:e.target.value})}/><input value={edit.phone} placeholder="Telefone" onChange={e=>setEdit({...edit,phone:e.target.value})}/><input value={edit.notes} placeholder="Informações importantes" onChange={e=>setEdit({...edit,notes:e.target.value})}/><button className="primary" onClick={update}>Salvar alterações</button></Modal>}</>
}

function Mothers({data,admin,reload,toast}:{data:Data;admin:boolean;reload:()=>Promise<void>;toast:(s:string)=>void}){
  const blank={name:'',phone:'',email:'',notes:'',active:true,birth:'',ageInfo:''};const[f,setF]=useState(blank),[edit,setEdit]=useState<Mother|null>(null);
  const payload=(x:any)=>({name:x.name,phone:x.phone,email:x.email,notes:x.notes,active:x.active,birth:x.birth||null,age_info:x.ageInfo});
  const save=async()=>{if(!f.name.trim())return toast('Informe o nome.');const{error}=await supabase.from('sabado_mothers').insert(payload(f));if(error)return toast(error.message);setF(blank);await reload();toast('Mãe cadastrada.')};
  const update=async()=>{if(!edit)return;const{error}=await supabase.from('sabado_mothers').update(payload(edit)).eq('id',edit.id);if(error)return toast(error.message);setEdit(null);await reload();toast('Cadastro alterado.')};
  const del=async(m:Mother)=>softDeleteRecord('sabado_mothers',m.id,`o cadastro ${m.name}`,reload,toast);
  return <><Title t="Mães" s={admin?"Cadastre as mães que auxiliam nas atividades e limpeza.":"Consulta de mães auxiliares."}/>{admin&&<div className="panel form data-form"><h3><Heart size={18}/> Nova mãe auxiliar</h3><input placeholder="Nome completo *" value={f.name} onChange={e=>setF({...f,name:e.target.value})}/><input placeholder="Telefone / WhatsApp" value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/><input type="email" placeholder="E-mail" value={f.email} onChange={e=>setF({...f,email:e.target.value})}/><input type="date" value={f.birth} onChange={e=>setF({...f,birth:e.target.value})}/><input placeholder="Idade (ex.: 35 anos)" value={f.ageInfo} onChange={e=>setF({...f,ageInfo:e.target.value})}/><input placeholder="Observações" value={f.notes} onChange={e=>setF({...f,notes:e.target.value})}/><label className="checkline"><input type="checkbox" checked={f.active} onChange={e=>setF({...f,active:e.target.checked})}/> Ativa</label><button className="primary" onClick={save}><Save size={17}/> Salvar mãe</button></div>}
  <div className="cards">{data.mothers.map(m=><div className="person" key={m.id}><div className="avatar">{m.name[0]}</div><div><b>{m.name}</b><small>{m.birth?fmt(m.birth):'Nascimento não informado'} · {m.ageInfo||'Idade não informada'}</small><small>{m.phone||'Telefone não informado'}</small><small>{m.active?'Ativa · Auxílio na limpeza':'Inativa'}</small></div>{admin&&<div className="record-actions"><button className="edit-icon" onClick={()=>setEdit({...m})}><Pencil size={16}/></button><button className="danger-icon outline-danger" onClick={()=>del(m)}><Trash2 size={16}/></button></div>}</div>)}</div>
  {admin&&edit&&<Modal title="Alterar mãe" close={()=>setEdit(null)}><input value={edit.name} onChange={e=>setEdit({...edit,name:e.target.value})}/><input value={edit.phone} onChange={e=>setEdit({...edit,phone:e.target.value})}/><input value={edit.email} onChange={e=>setEdit({...edit,email:e.target.value})}/><input type="date" value={edit.birth} onChange={e=>setEdit({...edit,birth:e.target.value})}/><input value={edit.ageInfo} placeholder="Idade" onChange={e=>setEdit({...edit,ageInfo:e.target.value})}/><input value={edit.notes} onChange={e=>setEdit({...edit,notes:e.target.value})}/><label className="checkline"><input type="checkbox" checked={edit.active} onChange={e=>setEdit({...edit,active:e.target.checked})}/> Ativa</label><button className="primary" onClick={update}>Salvar alterações</button></Modal>}</>
}

function Schedules({data,admin,reload,toast,selectedYear,closed}:{data:Data;admin:boolean;reload:()=>Promise<void>;toast:(s:string)=>void;selectedYear:number;closed:boolean}){
  const blank={date:'',adolescentTeacher:'',youngerTeacher:'',cleaningHelper:'',topic:'',replacementReason:''};
  const[f,setF]=useState(blank),[edit,setEdit]=useState<Schedule|null>(null),[showAdd,setShowAdd]=useState(false);
  const[autoOpen,setAutoOpen]=useState(false),[autoMonth,setAutoMonth]=useState(()=>`${selectedYear}-${String(new Date().getMonth()+1).padStart(2,'0')}`),[autoTopic,setAutoTopic]=useState('A definir'),[autoPreview,setAutoPreview]=useState<Omit<Schedule,'id'>[]>([]),[autoSaving,setAutoSaving]=useState(false);

  useEffect(()=>{setAutoMonth(`${selectedYear}-${String(new Date().getMonth()+1).padStart(2,'0')}`);setAutoPreview([])},[selectedYear]);
  const yearSchedules=data.schedules.filter(s=>recordYear(s.date)===selectedYear);
  const activeTeachers=data.users.filter(u=>u.role==='Professor'&&u.status!=='Inativo');
  const teacherNames=[...new Set(activeTeachers.map(u=>u.name).concat(yearSchedules.flatMap(s=>[s.adolescentTeacher,s.youngerTeacher])))].filter(Boolean).sort();
  const activeMothers=data.mothers.filter(m=>m.active);
  const payload=(x:any)=>({date:x.date,adolescent_teacher:x.adolescentTeacher,younger_teacher:x.youngerTeacher,cleaning_helper:x.cleaningHelper,topic:x.topic,replacement_reason:x.replacementReason||''});

  const save=async()=>{if(closed)return toast(`O ano ${selectedYear} está encerrado.`);if(!f.date||!f.adolescentTeacher||!f.youngerTeacher||!f.topic)return toast('Preencha data, professores e assunto.');if(recordYear(f.date)!==selectedYear)return toast(`Escolha uma data de ${selectedYear}.`);const{error}=await supabase.from('sabado_schedules').insert(payload(f));if(error)return toast(error.message);setF(blank);setShowAdd(false);await reload();toast('Escala adicionada.')};
  const update=async()=>{
    if(!edit)return;if(closed)return toast(`O ano ${selectedYear} está encerrado.`);if(recordYear(edit.date)!==selectedYear)return toast(`A escala deve permanecer em ${selectedYear}.`);
    const previous=data.schedules.find(s=>s.id===edit.id);
    const teacherChanged=!!previous&&(previous.adolescentTeacher!==edit.adolescentTeacher||previous.youngerTeacher!==edit.youngerTeacher);
    const{error}=await supabase.from('sabado_schedules').update(payload(edit)).eq('id',edit.id);
    if(error)return toast(error.message);
    setEdit(null);await reload();toast(teacherChanged?'Escala alterada e professores notificados.':'Escala alterada.');
  };
  const del=async(s:Schedule)=>softDeleteRecord('sabado_schedules',s.id,'esta escala',reload,toast);

  const monthSaturdays=(ym:string)=>{
    const[y,m]=ym.split('-').map(Number);
    if(!y||!m)return[];
    const result:string[]=[];
    const d=new Date(y,m-1,1);
    while(d.getMonth()===m-1&&d.getDay()!==6)d.setDate(d.getDate()+1);
    while(d.getMonth()===m-1){
      result.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
      d.setDate(d.getDate()+7);
    }
    return result;
  };

  const generateAutomatic=()=>{
    if(!autoMonth)return toast('Selecione o mês.');if(Number(autoMonth.slice(0,4))!==selectedYear)return toast(`Escolha um mês de ${selectedYear}.`);
    if(!activeTeachers.length)return toast('Cadastre pelo menos um professor ativo.');
    const existingDates=new Set(yearSchedules.map(s=>s.date));
    const dates=monthSaturdays(autoMonth).filter(d=>!existingDates.has(d));
    if(!dates.length){setAutoPreview([]);return toast('Todos os sábados deste mês já possuem escala.');}

    const allNames=[...new Set(activeTeachers.map(u=>u.name))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
    const adolescentPool=[...new Set(activeTeachers.filter(u=>u.group==='Adolescentes'||u.group==='Geral').map(u=>u.name))];
    const youngerPool=[...new Set(activeTeachers.filter(u=>u.group==='Menores'||u.group==='Geral').map(u=>u.name))];
    const adPool=(adolescentPool.length?adolescentPool:allNames).sort((a,b)=>a.localeCompare(b,'pt-BR'));
    const yoPool=(youngerPool.length?youngerPool:allNames).sort((a,b)=>a.localeCompare(b,'pt-BR'));
    const momPool=activeMothers.map(m=>m.name).sort((a,b)=>a.localeCompare(b,'pt-BR'));

    const adCount:Record<string,number>={},yoCount:Record<string,number>={},momCount:Record<string,number>={};
    const adLast:Record<string,string>={},yoLast:Record<string,string>={},momLast:Record<string,string>={};
    adPool.forEach(n=>adCount[n]=0);yoPool.forEach(n=>yoCount[n]=0);momPool.forEach(n=>momCount[n]=0);

    [...yearSchedules].sort((a,b)=>a.date.localeCompare(b.date)).forEach(s=>{
      if(s.adolescentTeacher&&adCount[s.adolescentTeacher]!==undefined){adCount[s.adolescentTeacher]++;adLast[s.adolescentTeacher]=s.date}
      if(s.youngerTeacher&&yoCount[s.youngerTeacher]!==undefined){yoCount[s.youngerTeacher]++;yoLast[s.youngerTeacher]=s.date}
      if(s.cleaningHelper&&momCount[s.cleaningHelper]!==undefined){momCount[s.cleaningHelper]++;momLast[s.cleaningHelper]=s.date}
    });

    const pick=(pool:string[],counts:Record<string,number>,last:Record<string,string>,avoid='')=>{
      const available=pool.length>1&&avoid?pool.filter(n=>n!==avoid):pool;
      return [...available].sort((a,b)=>(counts[a]||0)-(counts[b]||0)||String(last[a]||'').localeCompare(String(last[b]||''))||a.localeCompare(b,'pt-BR'))[0]||'';
    };

    const rows:Omit<Schedule,'id'>[]=dates.map(date=>{
      const adolescentTeacher=pick(adPool,adCount,adLast);
      if(adolescentTeacher){adCount[adolescentTeacher]=(adCount[adolescentTeacher]||0)+1;adLast[adolescentTeacher]=date}
      const youngerTeacher=pick(yoPool,yoCount,yoLast,adolescentTeacher);
      if(youngerTeacher){yoCount[youngerTeacher]=(yoCount[youngerTeacher]||0)+1;yoLast[youngerTeacher]=date}
      const cleaningHelper=pick(momPool,momCount,momLast);
      if(cleaningHelper){momCount[cleaningHelper]=(momCount[cleaningHelper]||0)+1;momLast[cleaningHelper]=date}
      return{date,adolescentTeacher,youngerTeacher,cleaningHelper,topic:autoTopic.trim()||'A definir',replacementReason:'Gerada automaticamente pelo sistema'};
    });
    setAutoPreview(rows);
  };

  const changeAuto=(i:number,patch:Partial<Omit<Schedule,'id'>>)=>setAutoPreview(prev=>prev.map((r,idx)=>idx===i?{...r,...patch}:r));

  const saveAutomatic=async()=>{
    if(closed)return toast(`O ano ${selectedYear} está encerrado.`);if(!autoPreview.length)return toast('Gere a prévia antes de salvar.');
    if(autoPreview.some(r=>!r.adolescentTeacher||!r.youngerTeacher||!r.topic.trim()))return toast('Revise professores e assuntos antes de salvar.');
    setAutoSaving(true);
    try{
      const dates=autoPreview.map(r=>r.date);
      const{data:existing,error:checkError}=await supabase.from('sabado_schedules').select('date').in('date',dates);
      if(checkError)return toast(checkError.message);
      const existingSet=new Set((existing||[]).map((x:any)=>dateOnly(x.date)));
      const rows=autoPreview.filter(r=>!existingSet.has(r.date));
      if(!rows.length)return toast('Essas datas já possuem escala.');
      const{error}=await supabase.from('sabado_schedules').insert(rows.map(payload));
      if(error)return toast(error.message);
      setAutoPreview([]);setAutoOpen(false);await reload();
      toast(`${rows.length} escala${rows.length===1?'':'s'} gerada${rows.length===1?'':'s'} automaticamente.`);
    }finally{setAutoSaving(false)}
  };

  return <><div className="section-head schedule-section-head"><Title t="Escalas" s="Professores dos adolescentes, professores dos menores, mães auxiliares e assunto de cada sábado."/>{admin&&!closed&&<div className="schedule-top-actions"><button className="auto-generate-btn compact-action" onClick={()=>{setAutoOpen(true);setAutoPreview([])}}><CalendarDays size={17}/> Gerar automaticamente</button><button className="primary compact-action" onClick={()=>setShowAdd(true)}><Plus size={17}/> Adicionar escala</button></div>}</div>
  {admin&&!closed&&showAdd&&<div className="panel form data-form schedule-add-form"><div className="schedule-form-head"><h3><Plus size={18}/> Nova escala</h3><button className="icon-close schedule-form-close" title="Fechar" onClick={()=>setShowAdd(false)}><X size={18}/></button></div><input type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})}/><select value={f.adolescentTeacher} onChange={e=>setF({...f,adolescentTeacher:e.target.value})}><option value="">Professor — Adolescentes</option>{teacherNames.map(t=><option key={t}>{t}</option>)}</select><select value={f.youngerTeacher} onChange={e=>setF({...f,youngerTeacher:e.target.value})}><option value="">Professor — Menores</option>{teacherNames.map(t=><option key={t}>{t}</option>)}</select><select value={f.cleaningHelper} onChange={e=>setF({...f,cleaningHelper:e.target.value})}><option value="">Mãe — Auxílio na Limpeza</option>{activeMothers.map(m=><option key={m.id}>{m.name}</option>)}</select><input placeholder="Tema da palestra / assunto" value={f.topic} onChange={e=>setF({...f,topic:e.target.value})}/><button className="primary" onClick={save}><Save size={17}/> Salvar escala</button></div>}
  {closed&&<div className="closed-year-note">🔒 Ano {selectedYear} encerrado. Escalas apenas para consulta.</div>}<div className="panel schedule-panel">{yearSchedules.map(s=><div className="schedule-row" key={s.id}><div className="schedule-date"><b>{fmt(s.date)}</b><small>sábado</small>{admin&&!closed&&<div className="schedule-actions"><button className="edit-schedule" onClick={()=>setEdit({...s})}><Pencil size={15}/> Alterar</button><button className="danger-icon schedule-delete" title="Excluir escala" onClick={()=>del(s)}><Trash2 size={15}/></button></div>}</div><div className="schedule-field"><span className="field-label">Adolescentes</span><span className="text-separator">-</span><b>{s.adolescentTeacher}</b></div><div className="schedule-field"><span className="field-label">Menores</span><span className="text-separator">-</span><b>{s.youngerTeacher}</b></div><div className="schedule-field"><span className="field-label">Mãe - limpeza</span><span className="text-separator">-</span><b>{s.cleaningHelper||'—'}</b></div><div className="schedule-topic schedule-field"><span className="field-label">Assunto</span><span className="text-separator">-</span><b>{s.topic}</b></div></div>)}</div>
  {admin&&!closed&&autoOpen&&<Modal title="Gerar escala automática" close={()=>{setAutoOpen(false);setAutoPreview([])}}><div className="auto-schedule-config"><label>Mês da escala</label><input type="month" value={autoMonth} onChange={e=>{setAutoMonth(e.target.value);setAutoPreview([])}}/><label>Assunto padrão</label><input value={autoTopic} onChange={e=>{setAutoTopic(e.target.value);setAutoPreview([])}} placeholder="Ex.: A definir"/><div className="auto-rules"><b>Regras usadas automaticamente</b><span>• Professores ativos entram no rodízio.</span><span>• “Geral” pode atuar nas duas turmas.</span><span>• O sistema prioriza quem participou menos vezes.</span><span>• Evita o mesmo professor nas duas turmas no mesmo sábado, quando possível.</span><span>• Mães ativas entram no rodízio da limpeza.</span><span>• Sábados que já possuem escala são ignorados.</span></div><button className="primary" onClick={generateAutomatic}><CalendarDays size={17}/> Gerar prévia do mês</button></div>
  {autoPreview.length>0&&<div className="auto-preview"><h3>Prévia — revise antes de salvar</h3>{autoPreview.map((r,i)=><div className="auto-preview-row" key={r.date}><div className="auto-preview-date"><b>{fmt(r.date)}</b><small>sábado</small></div><label>Adolescentes<select value={r.adolescentTeacher} onChange={e=>changeAuto(i,{adolescentTeacher:e.target.value})}>{teacherNames.map(t=><option key={t}>{t}</option>)}</select></label><label>Menores<select value={r.youngerTeacher} onChange={e=>changeAuto(i,{youngerTeacher:e.target.value})}>{teacherNames.map(t=><option key={t}>{t}</option>)}</select></label><label>Mãe — limpeza<select value={r.cleaningHelper} onChange={e=>changeAuto(i,{cleaningHelper:e.target.value})}><option value="">—</option>{activeMothers.map(m=><option key={m.id}>{m.name}</option>)}</select></label><label className="auto-topic">Assunto<input value={r.topic} onChange={e=>changeAuto(i,{topic:e.target.value})}/></label></div>)}<button className="primary" disabled={autoSaving} onClick={saveAutomatic}><Save size={17}/> {autoSaving?'Salvando...':'Confirmar e salvar escalas'}</button></div>}</Modal>}
  {admin&&!closed&&edit&&<Modal title="Alterar escala" close={()=>setEdit(null)}><label>Professor — Adolescentes</label><select value={edit.adolescentTeacher} onChange={e=>setEdit({...edit,adolescentTeacher:e.target.value})}>{teacherNames.map(t=><option key={t}>{t}</option>)}</select><label>Professor — Menores</label><select value={edit.youngerTeacher} onChange={e=>setEdit({...edit,youngerTeacher:e.target.value})}>{teacherNames.map(t=><option key={t}>{t}</option>)}</select><label>Mãe — Auxílio na Limpeza</label><select value={edit.cleaningHelper} onChange={e=>setEdit({...edit,cleaningHelper:e.target.value})}><option value="">—</option>{activeMothers.map(m=><option key={m.id}>{m.name}</option>)}</select><label>Assunto</label><input value={edit.topic} onChange={e=>setEdit({...edit,topic:e.target.value})}/><label>Motivo da substituição</label><input value={edit.replacementReason} onChange={e=>setEdit({...edit,replacementReason:e.target.value})}/><button className="primary" onClick={update}>Salvar alteração</button></Modal>}</>
}
function Meetings({data,admin,reload,toast,setMeeting,selectedYear,closed}:{data:Data;admin:boolean;reload:()=>Promise<void>;toast:(s:string)=>void;setMeeting:(m:Meeting)=>void;selectedYear:number;closed:boolean}){
  const blank={title:'',date:'',time:'',location:'',notes:''};const[f,setF]=useState(blank),[edit,setEdit]=useState<Meeting|null>(null);
  const yearMeetings=data.meetings.filter(m=>recordYear(m.date)===selectedYear);
  const formatMeetingTime=(value:string)=>{const digits=value.replace(/\D/g,'').slice(0,4);if(digits.length<=2)return digits;return digits.slice(0,2)+':'+digits.slice(2)};
  const validMeetingTime=(value:string)=>!value||/^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  const save=async()=>{
    if(closed)return toast(`O ano ${selectedYear} está encerrado.`);
    if(!f.title||!f.date)return toast('Informe título e data.');
    if(recordYear(f.date)!==selectedYear)return toast(`Escolha uma data de ${selectedYear}.`);if(!validMeetingTime(f.time))return toast('Informe um horário válido no formato HH:MM.');
    const{error}=await supabase.from('sabado_meetings').insert({...f,time:f.time||null});
    if(error)return toast(error.message);
    setF(blank);await reload();toast('Reunião marcada e professores notificados.');
  };
  const update=async()=>{
    if(!edit)return;if(closed)return toast(`O ano ${selectedYear} está encerrado.`);if(recordYear(edit.date)!==selectedYear)return toast(`A reunião deve permanecer em ${selectedYear}.`);
    if(!validMeetingTime(edit.time))return toast('Informe um horário válido no formato HH:MM.');
    const{error}=await supabase.from('sabado_meetings').update({title:edit.title,date:edit.date,time:edit.time||null,location:edit.location,notes:edit.notes,updated_at:new Date().toISOString()}).eq('id',edit.id);
    if(error)return toast(error.message);
    await supabase.from('sabado_meeting_responses').delete().eq('meeting_id',edit.id);
    setEdit(null);await reload();toast('Reunião reagendada e professores notificados.');
  };
  const del=async(m:Meeting)=>softDeleteRecord('sabado_meetings',m.id,`a reunião ${m.title}`,reload,toast);
  return <><Title t="Reuniões" s="Marque reuniões, acompanhe confirmações e avise todos os professores pelo sistema."/>{admin&&!closed&&<div className="panel form data-form meeting-form"><h3><CalendarDays size={18}/> Nova reunião</h3><input placeholder="Título da reunião *" value={f.title} onChange={e=>setF({...f,title:e.target.value})}/><input type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})}/><input className="meeting-time-input" type="text" inputMode="numeric" maxLength={5} placeholder="Horário (HH:MM)" value={f.time} onChange={e=>setF({...f,time:formatMeetingTime(e.target.value)})}/><input placeholder="Local" value={f.location} onChange={e=>setF({...f,location:e.target.value})}/><input placeholder="Observações / pauta" value={f.notes} onChange={e=>setF({...f,notes:e.target.value})}/><button className="primary" onClick={save}><Bell size={17}/> Marcar e notificar professores</button></div>}
  {closed&&<div className="closed-year-note">🔒 Ano {selectedYear} encerrado. Reuniões apenas para consulta.</div>}<div className="panel"><h3>Reuniões marcadas em {selectedYear}</h3>{yearMeetings.map(m=>{const yes=data.responses.filter(r=>r.meetingId===m.id&&r.status==='yes'),no=data.responses.filter(r=>r.meetingId===m.id&&r.status==='no');return <div className="meeting-card" key={m.id}><div className="meeting-main"><div><b>{m.title}</b><small>{fmt(m.date)} {m.time} {m.location&&'· '+m.location}</small></div><div className="meeting-actions"><button className="notice-action" onClick={()=>setMeeting(m)}>Responder</button>{admin&&!closed&&<><button className="edit-icon" onClick={()=>setEdit({...m})}><Pencil size={16}/> Reagendar</button><button className="danger-icon" onClick={()=>del(m)}><Trash2 size={16}/> Excluir</button></>}</div></div><div className="rsvp-summary"><div className="rsvp-box yes"><b>✅ Vai participar</b>{yes.length?yes.map(r=><span key={r.id}>{r.userName}</span>):<small>Ninguém confirmou ainda.</small>}</div><div className="rsvp-box no"><b>❌ Não poderá</b>{no.length?no.map(r=><span key={r.id}>{r.userName}</span>):<small>Ninguém informou ausência.</small>}</div></div></div>})}{!yearMeetings.length&&<Empty text={`Nenhuma reunião marcada em ${selectedYear}.`}/>}</div>
  {admin&&!closed&&edit&&<Modal title="Reagendar reunião" close={()=>setEdit(null)}><input value={edit.title} onChange={e=>setEdit({...edit,title:e.target.value})}/><input type="date" value={edit.date} onChange={e=>setEdit({...edit,date:e.target.value})}/><input className="meeting-time-input" type="text" inputMode="numeric" maxLength={5} placeholder="Horário (HH:MM)" value={edit.time} onChange={e=>setEdit({...edit,time:formatMeetingTime(e.target.value)})}/><input value={edit.location} placeholder="Local" onChange={e=>setEdit({...edit,location:e.target.value})}/><input value={edit.notes} placeholder="Observações / pauta" onChange={e=>setEdit({...edit,notes:e.target.value})}/><button className="primary" onClick={update}>Salvar reagendamento</button></Modal>}</>
}

function AttendancePage({data,admin,reload,toast,selectedYear,closed}:{data:Data;admin:boolean;reload:()=>Promise<void>;toast:(s:string)=>void;selectedYear:number;closed:boolean}){
  const today=new Date().toISOString().slice(5,10);
  const[date,setDate]=useState(`${selectedYear}-${today}`),[teacher,setTeacher]=useState(''),[group,setGroup]=useState('Todos os alunos'),[marks,setMarks]=useState<Record<string,boolean>>({});
  useEffect(()=>{setDate(`${selectedYear}-${today}`);setMarks({})},[selectedYear]);
  const list=data.students.filter(s=>group==='Todos os alunos'||s.group===group).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
  const teachers=[...new Set(data.users.filter(u=>u.role==='Professor'&&u.status!=='Inativo').map(u=>u.name).concat(data.schedules.flatMap(s=>[s.adolescentTeacher,s.youngerTeacher])))].filter(Boolean).sort();
  const counts:Record<string,number>={};
  data.attendance.filter(a=>Number(a.date.slice(0,4))===selectedYear).forEach(a=>a.entries.forEach(e=>{if(e.present)counts[e.studentId]=(counts[e.studentId]||0)+1}));
  const medal=(c:number)=>c>=20?'🥇':c>=15?'🥉':c>=10?'🥈':'';
  const save=async()=>{
    if(closed)return toast(`O ano ${selectedYear} está encerrado e não aceita novas chamadas.`);if(recordYear(date)!==selectedYear)return toast(`Escolha uma data de ${selectedYear}.`);
    if(!teacher)return toast('Selecione o professor responsável.');
    if(!list.length)return toast('Não há alunos nesta turma para realizar a chamada.');
    const unmarked=list.filter(s=>!Object.prototype.hasOwnProperty.call(marks,s.id));
    if(unmarked.length)return toast(`Marque Sim ou Não para todos os alunos. Faltam ${unmarked.length}.`);
    const entries=list.map(s=>({studentId:s.id,name:s.name,present:marks[s.id]===true}));
    const{error}=await supabase.from('sabado_attendance').insert({date,teacher,group_name:group,entries});
    if(error)return toast(error.message);
    setMarks({});await reload();toast('Chamada salva.');
  };
  return <><Title t="Chamada" s={admin?"Marque Sim ou Não e salve o registro da aula.":"Consulta de presença liberada. Para lançar uma chamada, solicite a permissão ao administrador."}/>{admin&&!closed&&<div className="panel controls"><input type="date" value={date} onChange={e=>setDate(e.target.value)}/><select value={teacher} onChange={e=>setTeacher(e.target.value)}><option value="">Professor responsável</option>{teachers.map(t=><option key={t}>{t}</option>)}</select><select value={group} onChange={e=>setGroup(e.target.value)}><option>Todos os alunos</option><option>A definir</option><option>Menores</option><option>Adolescentes</option></select><div className="year-context-box">Ano letivo: <b>{selectedYear}</b></div></div>}
  {closed&&<div className="closed-year-note">🔒 Ano {selectedYear} encerrado. Presenças congeladas para consulta.</div>}<div className="annual-summary"><b>Controle anual de presença — {selectedYear}</b><span>A contagem considera somente chamadas salvas neste ano. Ao iniciar um novo ano, a contagem começa automaticamente em 0, mantendo o histórico dos anos anteriores.</span><div className="medal-legend"><span>🥈 10 presenças</span><span>🥉 15 presenças</span><span>🥇 20 presenças ou mais</span></div></div>
  <div className="panel">{list.map(s=>{const c=counts[s.id]||0;return <div className="att" key={s.id}><div className="att-student"><div className="identity-line"><b>{s.name}</b><span className="text-separator">-</span><small>{s.group}</small></div><span className="presence-count">{selectedYear}: {c} presenças {medal(c)&&<span className="medal">{medal(c)}</span>}</span></div>{admin&&!closed&&<div className="attendance-actions"><button type="button" aria-pressed={marks[s.id]===true} className={marks[s.id]===true?'yes selected':'yes'} onClick={()=>setMarks(prev=>({...prev,[s.id]:true}))}>Sim</button><button type="button" aria-pressed={marks[s.id]===false} className={marks[s.id]===false?'no selected':'no'} onClick={()=>setMarks(prev=>({...prev,[s.id]:false}))}>Não</button></div>}</div>})}{admin&&!closed&&<button className="primary wide" onClick={save}>Salvar chamada</button>}</div></>
}

function HistoryPage({data,admin,reload,toast,selectedYear}:{data:Data;admin:boolean;reload:()=>Promise<void>;toast:(s:string)=>void;selectedYear:number}){
  const[open,setOpen]=useState<string|null>(null);const yearAttendance=data.attendance.filter(a=>recordYear(a.date)===selectedYear);const closed=data.academicYears.some(x=>x.year===selectedYear&&x.status==='closed');
  const del=async(a:Attendance)=>{if(!admin)return;await softDeleteRecord('sabado_attendance',a.id,'esta chamada',reload,toast)};
  return <><Title t={`Histórico de Aulas — ${selectedYear}`} s="Datas, professores e chamadas que ficam registradas."/><div className="panel history-panel">{yearAttendance.map(a=>{const p=a.entries.filter(e=>e.present).length;return <div className="history" key={a.id}><div className="history-head"><button onClick={()=>setOpen(open===a.id?null:a.id)}><div><b>{fmt(a.date)}</b><small>Professor: {a.teacher} · {a.group}</small></div><span>{p} presentes · {a.entries.length-p} faltas</span></button>{admin&&!closed&&<button className="danger-icon" onClick={()=>del(a)}><Trash2 size={15}/></button>}</div>{open===a.id&&<div className="details">{a.entries.map(e=><div key={e.studentId}><span>{e.name}</span><b className={e.present?'green':'red'}>{e.present?'Presente':'Faltou'}</b></div>)}</div>}</div>})}{!yearAttendance.length&&<Empty text={`Nenhuma chamada salva em ${selectedYear}.`}/>}</div></>
}

function Birthdays({data}:{data:Data}){const[m,setM]=useState(new Date().getMonth());const list=useMemo(()=>data.students.filter(s=>s.birth&&Number(s.birth.slice(5,7))===m+1).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')),[data,m]);return <><Title t="Aniversariantes do Mês" s="Controle mensal dos aniversários dos alunos."/><div className="months birthday-months">{months.map((x,i)=><button key={x} className={m===i?'active':''} onClick={()=>setM(i)}>{x}</button>)}</div><div className="birthday-list">{list.map(s=><div className="person" key={s.id}><div className="avatar">🎂</div><div><b>{s.name}</b><small>{fmt(s.birth)} · {s.group}</small></div></div>)}{!list.length&&<Empty text={'Nenhum aniversariante em '+months[m]+'.'}/>}</div></>}

function Calendar({data,admin,reload,toast,selectedYear,closed}:{data:Data;admin:boolean;reload:()=>Promise<void>;toast:(s:string)=>void;selectedYear:number;closed:boolean}){
  const yearEvents=data.events.filter(e=>recordYear(e.date)===selectedYear);
  const blank={title:'',date:'',type:'Evento',time:'',notes:''};const[f,setF]=useState(blank),[edit,setEdit]=useState<EventItem|null>(null);
  const payload=(x:any)=>({title:x.title,date:x.date,type:x.type,time:x.time||null,notes:x.notes});
  const save=async()=>{if(closed)return toast(`O ano ${selectedYear} está encerrado.`);if(!f.title||!f.date)return toast('Informe título e data.');if(recordYear(f.date)!==selectedYear)return toast(`Escolha uma data de ${selectedYear}.`);if(!validMobileTime(f.time))return toast('Informe um horário válido no formato HH:MM.');const{error}=await supabase.from('sabado_events').insert(payload(f));if(error)return toast(error.message);setF(blank);await reload();toast('Evento salvo.')};
  const update=async()=>{if(!edit)return;if(closed)return toast(`O ano ${selectedYear} está encerrado.`);if(recordYear(edit.date)!==selectedYear)return toast(`O evento deve permanecer em ${selectedYear}.`);if(!validMobileTime(edit.time))return toast('Informe um horário válido no formato HH:MM.');const{error}=await supabase.from('sabado_events').update(payload(edit)).eq('id',edit.id);if(error)return toast(error.message);setEdit(null);await reload();toast('Evento alterado.')};
  const del=async(e:EventItem)=>softDeleteRecord('sabado_events',e.id,`o evento ${e.title}`,reload,toast);
  return <><Title t="Calendário" s="Aulas, reuniões, eventos, campanhas e apresentações."/>{admin&&!closed&&<div className="panel form"><input placeholder="Título *" value={f.title} onChange={e=>setF({...f,title:e.target.value})}/><input type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})}/><input className="mobile-time-input" type="text" inputMode="numeric" maxLength={5} placeholder="Horário (HH:MM)" value={f.time} onChange={e=>setF({...f,time:formatMobileTime(e.target.value)})}/><select value={f.type} onChange={e=>setF({...f,type:e.target.value})}><option>Aula</option><option>Reunião</option><option>Evento</option><option>Campanha</option><option>Apresentação</option><option>Festa</option></select><input placeholder="Observações" value={f.notes} onChange={e=>setF({...f,notes:e.target.value})}/><button className="primary" onClick={save}><Plus size={17}/> Registrar no calendário</button></div>}{closed&&<div className="closed-year-note">🔒 Ano {selectedYear} encerrado. Calendário apenas para consulta.</div>}<div className="panel">{yearEvents.map(e=><div className="row" key={e.id}><div><b>{e.title}</b><small>{e.type} · {e.notes}</small></div><div className="event-actions"><span>{fmt(e.date)} {e.time}</span>{admin&&!closed&&<><button className="edit-icon" onClick={()=>setEdit({...e})}><Pencil size={16}/> Alterar</button><button className="danger-icon" onClick={()=>del(e)}><Trash2 size={16}/> Excluir</button></>}</div></div>)}</div>{admin&&!closed&&edit&&<Modal title="Alterar lançamento" close={()=>setEdit(null)}><input value={edit.title} onChange={e=>setEdit({...edit,title:e.target.value})}/><input type="date" value={edit.date} onChange={e=>setEdit({...edit,date:e.target.value})}/><input className="mobile-time-input" type="text" inputMode="numeric" maxLength={5} placeholder="Horário (HH:MM)" value={edit.time} onChange={e=>setEdit({...edit,time:formatMobileTime(e.target.value)})}/><select value={edit.type} onChange={e=>setEdit({...edit,type:e.target.value})}><option>Aula</option><option>Reunião</option><option>Evento</option><option>Campanha</option><option>Apresentação</option><option>Festa</option></select><input value={edit.notes} onChange={e=>setEdit({...edit,notes:e.target.value})}/><button className="primary" onClick={update}>Salvar alteração</button></Modal>}</>
}

function Celebrations({data,admin,reload,toast,selectedYear,closed}:{data:Data;admin:boolean;reload:()=>Promise<void>;toast:(s:string)=>void;selectedYear:number;closed:boolean}){
  const yearEvents=data.events.filter(e=>recordYear(e.date)===selectedYear);
  const[pick,setPick]=useState<{title:string;date:string;time:string;notes:string}|null>(null),[edit,setEdit]=useState<EventItem|null>(null),[showAdd,setShowAdd]=useState(false),[custom,setCustom]=useState({title:'',date:'',time:'',notes:''});
  const savePick=async()=>{if(closed)return toast(`O ano ${selectedYear} está encerrado.`);if(!pick?.date)return;if(recordYear(pick.date)!==selectedYear)return toast(`Escolha uma data de ${selectedYear}.`);if(!validMobileTime(pick.time))return toast('Informe um horário válido no formato HH:MM.');const{error}=await supabase.from('sabado_events').insert({title:pick.title,date:pick.date,type:'Festa',time:pick.time||null,notes:pick.notes});if(error)return toast(error.message);setPick(null);await reload();toast('Comemoração salva.')};
  const saveCustom=async()=>{if(closed)return toast(`O ano ${selectedYear} está encerrado.`);if(!custom.title||!custom.date)return;if(recordYear(custom.date)!==selectedYear)return toast(`Escolha uma data de ${selectedYear}.`);if(!validMobileTime(custom.time))return toast('Informe um horário válido no formato HH:MM.');const{error}=await supabase.from('sabado_events').insert({title:custom.title,date:custom.date,type:'Festa',time:custom.time||null,notes:custom.notes});if(error)return toast(error.message);setCustom({title:'',date:'',time:'',notes:''});setShowAdd(false);await reload();toast('Comemoração salva.')};
  const update=async()=>{if(!edit)return;if(closed)return toast(`O ano ${selectedYear} está encerrado.`);if(recordYear(edit.date)!==selectedYear)return toast(`A comemoração deve permanecer em ${selectedYear}.`);if(!validMobileTime(edit.time))return toast('Informe um horário válido no formato HH:MM.');const{error}=await supabase.from('sabado_events').update({title:edit.title,date:edit.date,time:edit.time||null,notes:edit.notes}).eq('id',edit.id);if(error)return toast(error.message);setEdit(null);await reload();toast('Comemoração alterada.')};
  const del=async(e:EventItem)=>softDeleteRecord('sabado_events',e.id,`a comemoração ${e.title}`,reload,toast);
  return <><div className="section-head"><Title t="🎉 Datas Comemorativas Gerais" s="As datas lançadas aqui aparecem automaticamente no painel principal."/>{admin&&!closed&&<button className="primary" onClick={()=>setShowAdd(true)}><Plus size={17}/> Adicionar comemoração</button>}</div><div className="celebs">{celebrationCards.map(([month,name])=><div className="celeb" key={name}><span>🎉</span><div><small>{month}</small><h3>{name}</h3></div>{admin&&!closed&&<button onClick={()=>setPick({title:name,date:'',time:'',notes:'Data comemorativa'})}>Marcar festa</button>}</div>)}</div><h2>Festas já marcadas</h2><div className="panel">{yearEvents.filter(e=>e.type==='Festa').map(e=><div className="row" key={e.id}><div><b>{e.title}</b><small>{e.notes||'Sem observações'}</small></div><div className="event-actions"><span>{fmt(e.date)} {e.time}</span>{admin&&!closed&&<><button className="edit-icon" onClick={()=>setEdit({...e})}><Pencil size={16}/> Alterar</button><button className="danger-icon" onClick={()=>del(e)}><Trash2 size={16}/> Excluir</button></>}</div></div>)}</div>
  {admin&&!closed&&pick&&<Modal title={'Marcar festa · '+pick.title} close={()=>setPick(null)}><input type="date" value={pick.date} onChange={e=>setPick({...pick,date:e.target.value})}/><input className="mobile-time-input" type="text" inputMode="numeric" maxLength={5} placeholder="Horário (HH:MM)" value={pick.time} onChange={e=>setPick({...pick,time:formatMobileTime(e.target.value)})}/><input value={pick.notes} onChange={e=>setPick({...pick,notes:e.target.value})}/><button className="primary" onClick={savePick}>Salvar festa</button></Modal>}
  {admin&&!closed&&showAdd&&<Modal title="Adicionar data comemorativa" close={()=>setShowAdd(false)}><input placeholder="Nome da comemoração" value={custom.title} onChange={e=>setCustom({...custom,title:e.target.value})}/><input type="date" value={custom.date} onChange={e=>setCustom({...custom,date:e.target.value})}/><input className="mobile-time-input" type="text" inputMode="numeric" maxLength={5} placeholder="Horário (HH:MM)" value={custom.time} onChange={e=>setCustom({...custom,time:formatMobileTime(e.target.value)})}/><input placeholder="Observações" value={custom.notes} onChange={e=>setCustom({...custom,notes:e.target.value})}/><button className="primary" onClick={saveCustom}>Salvar comemoração</button></Modal>}
  {admin&&!closed&&edit&&<Modal title="Alterar comemoração" close={()=>setEdit(null)}><input value={edit.title} onChange={e=>setEdit({...edit,title:e.target.value})}/><input type="date" value={edit.date} onChange={e=>setEdit({...edit,date:e.target.value})}/><input className="mobile-time-input" type="text" inputMode="numeric" maxLength={5} placeholder="Horário (HH:MM)" value={edit.time} onChange={e=>setEdit({...edit,time:formatMobileTime(e.target.value)})}/><input value={edit.notes} onChange={e=>setEdit({...edit,notes:e.target.value})}/><button className="primary" onClick={update}>Salvar alteração</button></Modal>}</>
}

function UsersPage({data,admin,reload,toast}:{data:Data;admin:boolean;reload:()=>Promise<void>;toast:(s:string)=>void}){
  const twoFactorPeriodLabel=`${data.settings.twoFactorIntervalValue} ${data.settings.twoFactorIntervalUnit==='days'?(data.settings.twoFactorIntervalValue===1?'dia':'dias'):(data.settings.twoFactorIntervalValue===1?'mês':'meses')}`;
  const blank={name:'',loginName:'',phone:'',group:'Geral',status:'Ativo'};
  const[f,setF]=useState(blank),[edit,setEdit]=useState<UserRec|null>(null),[permEdit,setPermEdit]=useState<UserRec|null>(null),[perm,setPerm]=useState<Record<string,boolean>>({...DEFAULT_TEACHER_PERMISSIONS});
  const visibleUsers=admin?data.users:data.users.filter(u=>u.role==='Professor'&&u.status!=='Inativo');

  const suggestedLogin=(name:string)=>name.trim().split(/\s+/)[0]||'';

  const save=async()=>{
    if(!admin)return;
    if(!f.name.trim())return toast('Informe o nome do usuário.');
    const login=(f.loginName.trim()||suggestedLogin(f.name)).replace(/\s+/g,'');
    if(!login)return toast('Informe o usuário para login.');
    const{error}=await supabase.from('sabado_users').insert({name:f.name.trim(),login_name:login,email:'',phone:f.phone,role:'Professor',group_name:f.group,status:f.status,permissions:DEFAULT_TEACHER_PERMISSIONS});
    if(error)return toast(error.message.includes('sabado_users_login_name_unique')?'Este usuário já está sendo utilizado. Escolha outro.':error.message);
    setF(blank);await reload();toast('Usuário cadastrado. No primeiro acesso ele criará a própria senha.');
  };

  const update=async()=>{
    if(!admin||!edit)return;
    if(!edit.loginName.trim())return toast('Informe o usuário para login.');
    const{error}=await supabase.from('sabado_users').update({name:edit.name.trim(),login_name:edit.loginName.trim().replace(/\s+/g,''),phone:edit.phone,role:edit.role,group_name:edit.group,status:edit.status}).eq('id',edit.id);
    if(error)return toast(error.message.includes('sabado_users_login_name_unique')?'Este usuário já está sendo utilizado. Escolha outro.':error.message);
    setEdit(null);await reload();toast('Usuário alterado.');
  };

  const openPermissions=(u:UserRec)=>{setPermEdit(u);setPerm(normalizePermissions(u.permissions))};

  const savePermissions=async()=>{
    if(!admin||!permEdit)return;
    const normalized=normalizePermissions(perm);
    const{error}=await supabase.from('sabado_users').update({permissions:normalized}).eq('id',permEdit.id);
    if(error)return toast(error.message);
    setPermEdit(null);await reload();toast('Permissões atualizadas.');
  };

  const resetAccess=async(u:UserRec)=>{
    if(!admin||!u.passwordCreated)return;
    if(!confirm('Liberar '+u.name+' para criar uma nova senha? A senha atual deixará de funcionar.'))return;
    const{data,error}=await supabase.rpc('sabado_username_reset_access',{p_profile_id:u.id});
    if(error)return toast(error.message);
    if(data!==true)return toast('Não foi possível liberar a nova senha.');
    await reload();toast('Nova senha liberada. No próximo acesso o usuário deverá tocar em “Primeiro acesso”.');
  };

  const resetTwoFactor=async(u:UserRec)=>{
    if(!admin||!u.passwordCreated)return;
    if(!confirm('Redefinir a verificação em duas etapas de '+u.name+'? O acesso atual será encerrado e a pessoa precisará configurar o autenticador novamente.'))return;
    const{data,error}=await supabase.rpc('sabado_username_reset_2fa',{p_profile_id:u.id});
    if(error)return toast(error.message);
    if(data!==true)return toast('Não foi possível redefinir a verificação em duas etapas.');
    await reload();toast('Verificação em duas etapas redefinida. No próximo login o usuário configurará o autenticador novamente.');
  };

  const del=async(u:UserRec)=>{
    if(!admin)return;
    if(u.email?.toLowerCase()===ADMIN_EMAIL)return toast('O Administrador não pode ser excluído aqui.');
    if(!confirm(`Mover ${u.name} para a Lixeira? O usuário ficará sem acesso e poderá ser restaurado por 30 dias.`))return;
    const{error}=await supabase.from('sabado_users').update({deleted_at:new Date().toISOString()}).eq('id',u.id);
    if(error)return toast(error.message);
    await reload();toast('Usuário movido para a Lixeira.');
  };

  return <><Title t={admin?'Usuários e Permissões':'Professores'} s={admin?'Cada usuário possui senha individual e verificação obrigatória em duas etapas.':'Lista de professores ativos.'}/>
  {admin&&<div className="panel access-instructions"><ShieldCheck size={22}/><div><b>Acesso protegido por duas etapas</b><span>Após criar a senha, cada professor deverá configurar um aplicativo autenticador. O sistema só libera o acesso depois de validar o código de 6 números. A verificação em duas etapas fica válida neste aparelho por <strong>{twoFactorPeriodLabel}</strong>.</span></div></div>}
  {admin&&<div className="panel form user-create-form"><input placeholder="Nome completo *" value={f.name} onChange={e=>setF({...f,name:e.target.value,loginName:f.loginName||suggestedLogin(e.target.value)})}/><input placeholder="Usuário para login * — ex.: Fernanda" value={f.loginName} onChange={e=>setF({...f,loginName:e.target.value.replace(/\s+/g,'')})}/><input placeholder="Telefone / WhatsApp (opcional)" value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/><select value={f.group} onChange={e=>setF({...f,group:e.target.value})}><option>Geral</option><option>Menores</option><option>Adolescentes</option></select><select value={f.status} onChange={e=>setF({...f,status:e.target.value})}><option>Ativo</option><option>Inativo</option></select><button className="primary" onClick={save}><Plus size={17}/> Cadastrar usuário</button></div>}
  <div className="cards">{visibleUsers.map(u=><div className="person user-access-card" key={u.id}><div className="avatar">{u.name[0]}</div><div><b>{u.name}</b><small>{u.role} · {u.group} · {u.status}</small>{admin&&<><small><strong>Usuário:</strong> {u.loginName||'Não definido'} {u.phone&&' · '+u.phone}</small><div className="access-security-status"><span className={u.passwordCreated?'access-status ready':'access-status missing'}>{u.passwordCreated?'Senha criada':'Aguardando primeiro acesso'}</span>{u.passwordCreated&&<span className={u.twoFactorEnabled?'access-status ready':'access-status missing'}>{u.twoFactorEnabled?'✓ 2 etapas ativa':'2 etapas pendente'}</span>}</div></>}</div>{admin&&<div className="record-actions permission-actions"><button className="edit-icon" onClick={()=>openPermissions(u)}><Settings size={16}/> Permissões</button>{u.passwordCreated&&<button className="edit-icon" onClick={()=>resetAccess(u)}><KeyRound size={16}/> Nova senha</button>}{u.passwordCreated&&<button className="edit-icon security-reset-button" onClick={()=>resetTwoFactor(u)}><ShieldCheck size={16}/> Redefinir 2 etapas</button>}<button className="edit-icon" onClick={()=>setEdit({...u})}><Pencil size={16}/></button>{u.email?.toLowerCase()!==ADMIN_EMAIL&&<button className="danger-icon" onClick={()=>del(u)}><Trash2 size={16}/></button>}</div>}</div>)}</div>
  {admin&&edit&&<Modal title="Alterar usuário" close={()=>setEdit(null)}><input value={edit.name} onChange={e=>setEdit({...edit,name:e.target.value})} placeholder="Nome completo"/><input value={edit.loginName} placeholder="Usuário para login" onChange={e=>setEdit({...edit,loginName:e.target.value.replace(/\s+/g,'')})}/><input value={edit.phone} placeholder="Telefone / WhatsApp" onChange={e=>setEdit({...edit,phone:e.target.value})}/><select value={edit.group} onChange={e=>setEdit({...edit,group:e.target.value})}><option>Geral</option><option>Menores</option><option>Adolescentes</option></select><select value={edit.status} onChange={e=>setEdit({...edit,status:e.target.value})}><option>Ativo</option><option>Inativo</option></select><select value={edit.role} onChange={e=>setEdit({...edit,role:e.target.value})}><option>Professor</option><option>Administrador</option></select><button className="primary" onClick={update}>Salvar alterações</button></Modal>}
  {admin&&permEdit&&<Modal title={'Permissões · '+permEdit.name} close={()=>setPermEdit(null)}><div className="permission-toolbar"><button onClick={()=>setPerm({...DEFAULT_TEACHER_PERMISSIONS})}>Padrão professor</button><button onClick={()=>setPerm(Object.fromEntries(Object.keys(DEFAULT_TEACHER_PERMISSIONS).map(k=>[k,true])))}>Liberar tudo</button><button onClick={()=>setPerm(Object.fromEntries(Object.keys(DEFAULT_TEACHER_PERMISSIONS).map(k=>[k,false])))}>Bloquear tudo</button></div><div className="permission-grid">{PERMISSION_GROUPS.map(g=><div className="permission-row" key={g.title}><b>{g.title}</b><div>{g.view&&<label><input type="checkbox" checked={perm[g.view]===true} onChange={e=>setPerm({...perm,[g.view!]:e.target.checked})}/> Visualizar</label>}{g.manage&&<label><input type="checkbox" checked={perm[g.manage]===true} onChange={e=>setPerm({...perm,[g.manage!]:e.target.checked,[g.view!]:e.target.checked?true:perm[g.view!]})}/> Alterar / lançar</label>}</div></div>)}</div><button className="primary wide permission-save-button" onClick={savePermissions}><Save size={17}/> Confirmar e salvar permissões</button></Modal>}</>
}


const annualMedal=(presences:number)=>presences>=20?'🥇':presences>=15?'🥉':presences>=10?'🥈':'—';
const annualFrequency=(presences:number,absences:number)=>{const total=presences+absences;return total>0?Math.round((presences/total)*100):0};

function annualSnapshotFromData(data:Data,year:number){
  const attendance=data.attendance.filter(a=>recordYear(a.date)===year);
  const student_presence=data.students.map(st=>{
    const entries=attendance.flatMap(a=>a.entries.filter(e=>e.studentId===st.id));
    const presences=entries.filter(e=>e.present).length;
    const absences=entries.filter(e=>!e.present).length;
    return{studentId:st.id,name:st.name,presences,absences,frequency:annualFrequency(presences,absences),medal:annualMedal(presences)};
  }).sort((a,b)=>b.presences-a.presences||a.name.localeCompare(b.name,'pt-BR'));
  return{
    year,
    students_total:data.students.length,
    attendance_classes:attendance.length,
    presences:attendance.reduce((n,a)=>n+a.entries.filter(e=>e.present).length,0),
    absences:attendance.reduce((n,a)=>n+a.entries.filter(e=>!e.present).length,0),
    schedules:data.schedules.filter(x=>recordYear(x.date)===year).length,
    meetings:data.meetings.filter(x=>recordYear(x.date)===year).length,
    events:data.events.filter(x=>recordYear(x.date)===year).length,
    student_presence
  };
}

function normalizeAnnualStudents(snapshot:any){
  const students=Array.isArray(snapshot?.student_presence)?snapshot.student_presence:[];
  return students.map((x:any)=>{
    const presences=Number(x.presences||0),absences=Number(x.absences||0);
    return{...x,presences,absences,frequency:Number.isFinite(Number(x.frequency))?Number(x.frequency):annualFrequency(presences,absences),medal:x.medal||annualMedal(presences)};
  });
}

function printAnnualReport(year:number,snapshot:any){
  const w=window.open('','_blank');if(!w)return;
  const students=normalizeAnnualStudents(snapshot);
  const rows=students.map((x:any,i:number)=>`<tr><td>${i+1}</td><td>${String(x.name||'')}</td><td>${x.presences}</td><td>${x.absences}</td><td>${x.frequency}%</td><td>${x.medal||'—'}</td></tr>`).join('');
  w.document.write(`<html><head><title>Relatório anual ${year}</title><style>@page{size:A4}body{font-family:Arial;padding:24px;color:#172033}h1{color:#245fd2}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.c{border:1px solid #ccd4e0;border-radius:10px;padding:12px}.c b{display:block;font-size:22px}table{width:100%;border-collapse:collapse;margin-top:20px;font-size:13px}th,td{border:1px solid #ccd4e0;padding:7px;text-align:left}th{background:#eef3fb}small{color:#667085}.center{text-align:center}</style></head><body><h1>Evangelização Infanto Juvenil</h1><h2>Relatório anual — ${year}</h2><small>Gestão e Coordenação</small><div class="cards"><div class="c">Aulas registradas<b>${Number(snapshot?.attendance_classes||0)}</b></div><div class="c">Presenças<b>${Number(snapshot?.presences||0)}</b></div><div class="c">Faltas<b>${Number(snapshot?.absences||0)}</b></div><div class="c">Escalas<b>${Number(snapshot?.schedules||0)}</b></div><div class="c">Reuniões<b>${Number(snapshot?.meetings||0)}</b></div><div class="c">Eventos<b>${Number(snapshot?.events||0)}</b></div></div><h3>Frequência por aluno</h3><table><thead><tr><th>#</th><th>Aluno</th><th>Presenças</th><th>Faltas</th><th>Frequência</th><th>Medalha</th></tr></thead><tbody>${rows||'<tr><td colspan="6">Nenhum aluno encontrado.</td></tr>'}</tbody></table><script>window.onload=()=>window.print()</script></body></html>`);w.document.close();
}

function AcademicYearPage({data,selectedYear,setSelectedYear,reload,toast,admin}:{data:Data;selectedYear:number;setSelectedYear:(y:number)=>void;reload:()=>Promise<void>;toast:(s:string)=>void;admin:boolean}){
  const closure=data.academicYears.find(x=>x.year===selectedYear&&x.status==='closed');
  const snapshot=closure?.snapshot||annualSnapshotFromData(data,selectedYear);
  const closeYear=async()=>{
    if(!admin)return toast('Somente o Administrador pode encerrar o ano letivo.');
    if(closure)return toast(`O ano ${selectedYear} já está encerrado.`);
    if(!confirm(`Encerrar definitivamente o ano letivo ${selectedYear}?\n\nOs totais serão congelados e registros com data em ${selectedYear} ficarão somente para consulta. O histórico será mantido.`))return;
    const reportWindow=window.open('','_blank');
    const{data:result,error}=await supabase.rpc('sabado_close_academic_year',{p_year:selectedYear});
    if(error){reportWindow?.close();return toast(error.message)}
    if(!result?.ok){reportWindow?.close();return toast(result?.error||'Não foi possível encerrar o ano.')}
    const snap=result.snapshot||snapshot;
    if(reportWindow){reportWindow.close();printAnnualReport(selectedYear,snap)}
    await reload();setSelectedYear(selectedYear+1);toast(`Ano ${selectedYear} encerrado. ${selectedYear+1} foi aberto com contagem zerada.`);
  };
  return <><Title t="Ano letivo" s="Selecione o ano de trabalho, gere o relatório anual e encerre o período quando ele terminar."/>
    <div className="academic-year-hero panel"><div><span>Ano selecionado</span><strong>{selectedYear}</strong><small>{closure?`Encerrado em ${new Date(closure.closedAt).toLocaleString('pt-BR')}`:'Ano aberto para lançamentos'}</small></div><div className={closure?'year-status closed':'year-status open'}>{closure?'🔒 Encerrado':'● Aberto'}</div></div>
    <div className="grid academic-summary"><Card t="Aulas" v={Number(snapshot.attendance_classes||0)}/><Card t="Presenças" v={Number(snapshot.presences||0)}/><Card t="Faltas" v={Number(snapshot.absences||0)}/><Card t="Escalas" v={Number(snapshot.schedules||0)}/><Card t="Reuniões" v={Number(snapshot.meetings||0)}/><Card t="Eventos" v={Number(snapshot.events||0)}/></div>
    <div className="panel annual-students-panel"><div className="annual-students-head"><div><b>Alunos e frequência — {selectedYear}</b><span>{closure?'Dados congelados no fechamento anual.':'Atualizado conforme as chamadas salvas no ano selecionado.'}</span></div><div className="medal-legend compact"><span>🥈 10</span><span>🥉 15</span><span>🥇 20+</span></div></div><div className="annual-students-table"><div className="annual-student-row header"><span>Aluno</span><span>Presenças</span><span>Faltas</span><span>Frequência</span><span>Medalha</span></div>{normalizeAnnualStudents(snapshot).map((st:any)=><div className="annual-student-row" key={st.studentId||st.name}><strong>{st.name}</strong><span className="stat-presence">{st.presences}</span><span className="stat-absence">{st.absences}</span><span>{st.frequency}%</span><span className="annual-medal">{st.medal||'—'}</span></div>)}{normalizeAnnualStudents(snapshot).length===0&&<div className="empty-state">Nenhum aluno encontrado para este ano.</div>}</div></div>
    <div className="panel academic-actions"><div><b>Relatório anual</b><span>{closure?'Este relatório usa os números congelados no fechamento.':'Prévia com os registros atuais do ano.'}</span></div><button className="ghost-btn" onClick={()=>printAnnualReport(selectedYear,snapshot)}>📄 Gerar relatório / PDF</button>{admin&&!closure&&<button className="danger-close-year" onClick={closeYear}>🔒 Encerrar ano {selectedYear}</button>}{!admin&&<small className="permission-note">Consulta liberada. O fechamento anual é exclusivo do Administrador.</small>}</div>
    <div className="panel year-help"><b>Como funciona o fechamento?</b><span>Ao encerrar {selectedYear}, o sistema salva um resumo definitivo do ano, bloqueia novos lançamentos com datas desse período e mantém todo o histórico para consulta. Em seguida, você pode trabalhar em {selectedYear+1}, cuja contagem de presenças começa em zero.</span></div>
  </>
}

function TrashPage({data:_,reload,toast}:{data:Data;reload:()=>Promise<void>;toast:(s:string)=>void}){
  const[items,setItems]=useState<TrashItem[]>([]),[loadingTrash,setLoadingTrash]=useState(true);
  const loadTrash=async()=>{
    setLoadingTrash(true);
    try{
      await supabase.rpc('sabado_purge_trash');
      const defs=[
        ['sabado_students','Aluno'],['sabado_users','Professor / Usuário'],['sabado_mothers','Mãe auxiliar'],['sabado_schedules','Escala'],['sabado_meetings','Reunião'],['sabado_attendance','Chamada'],['sabado_events','Evento']
      ] as const;
      const results=await Promise.all(defs.map(([table])=>supabase.from(table).select('*').not('deleted_at','is',null).order('deleted_at',{ascending:false})));
      const all:TrashItem[]=[];
      results.forEach((res,i)=>{const[table,type]=defs[i];(res.data||[]).forEach((x:any)=>{let name=x.name||x.title||'';let date=dateOnly(x.date);if(table==='sabado_schedules')name=`${date?fmt(date):'Escala'} · ${x.adolescent_teacher||'—'} / ${x.younger_teacher||'—'}`;if(table==='sabado_attendance')name=`${date?fmt(date):'Chamada'} · ${x.teacher||'—'}`;all.push({id:x.id,table,type,name:name||type,date,deletedAt:x.deleted_at})})});
      setItems(all.sort((a,b)=>String(b.deletedAt).localeCompare(String(a.deletedAt))));
    }finally{setLoadingTrash(false)}
  };
  useEffect(()=>{loadTrash()},[]);
  const restore=async(item:TrashItem)=>{const{error}=await supabase.from(item.table).update({deleted_at:null}).eq('id',item.id);if(error)return toast(error.message);await loadTrash();await reload();toast(`${item.type} restaurado.`)};
  const removeForever=async(item:TrashItem)=>{if(!confirm(`Excluir definitivamente "${item.name}"? Esta ação não poderá ser desfeita.`))return;if(item.table==='sabado_meetings'){await supabase.from('sabado_notifications').update({meeting_id:null}).eq('meeting_id',item.id);await supabase.from('sabado_meeting_responses').delete().eq('meeting_id',item.id)}const{error}=await supabase.from(item.table).delete().eq('id',item.id);if(error)return toast(error.message);await loadTrash();toast('Registro excluído definitivamente.')};
  const daysLeft=(iso:string)=>Math.max(0,30-Math.floor((Date.now()-new Date(iso).getTime())/86400000));
  return <><Title t="Lixeira" s="Registros excluídos ficam aqui por até 30 dias antes da remoção automática."/><div className="panel trash-info"><span>♻️ Você pode restaurar um item enquanto ele estiver na lixeira.</span><button className="ghost-btn" onClick={loadTrash}>Atualizar</button></div><div className="trash-grid">{items.map(item=><div className="trash-card" key={item.table+item.id}><div className="trash-main"><span className="trash-type">{item.type}</span><b>{item.name}</b>{item.date&&<small>Data: {fmt(item.date)}</small>}<small>Excluído em {new Date(item.deletedAt).toLocaleString('pt-BR')} · {daysLeft(item.deletedAt)} dia(s) para remoção automática</small></div><div className="trash-actions"><button className="restore-btn" onClick={()=>restore(item)}>↩ Restaurar</button><button className="danger-icon" onClick={()=>removeForever(item)}><Trash2 size={16}/> Excluir definitivamente</button></div></div>)}{!loadingTrash&&!items.length&&<Empty text="A Lixeira está vazia."/>}{loadingTrash&&<Empty text="Carregando Lixeira..."/>}</div></>
}

function AuditPage(){
  const[logs,setLogs]=useState<AuditLog[]>([]),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState(''),[search,setSearch]=useState(''),[action,setAction]=useState('Todos'),[entity,setEntity]=useState('Todos'),[open,setOpen]=useState<string|null>(null);
  const load=async()=>{
    setLoading(true);setLoadError('');
    const{data,error}=await supabase.rpc('sabado_get_audit_logs',{p_limit:1000});
    if(error){
      setLogs([]);
      setLoadError('Não foi possível carregar a auditoria. Atualize a página e tente novamente.');
      console.error('Erro ao carregar auditoria:',error);
    }else{
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
    const details=[x.beforeData,x.afterData].filter(Boolean).map(v=>JSON.stringify(v)).join(' ');
    const matchesSearch=!q||[x.actorName,x.actorEmail,x.entityType,x.entityName,x.recordId,details].some(v=>(v||'').toLowerCase().includes(q));
    return matchesSearch&&(action==='Todos'||x.action===action)&&(entity==='Todos'||x.entityType===entity);
  });
  const pretty=(v:any)=>JSON.stringify(v,null,2);
  return <><div className="section-head"><Title t="Registro de Auditoria" s="Veja quem cadastrou, alterou ou excluiu registros e em qual data e horário."/><button className="primary compact-action" onClick={load}>Atualizar</button></div>
  <div className="panel controls audit-controls"><input placeholder="Buscar por usuário ou registro" value={search} onChange={e=>setSearch(e.target.value)}/><select value={action} onChange={e=>setAction(e.target.value)}><option>Todos</option><option value="insert">Cadastrou</option><option value="update">Alterou</option><option value="delete">Excluiu</option></select><select value={entity} onChange={e=>setEntity(e.target.value)}>{entities.map(x=><option key={x}>{x}</option>)}</select></div>
  <div className="panel audit-panel">{loading?<div className="empty">Carregando auditoria...</div>:loadError?<div className="empty">{loadError}</div>:filtered.map(log=><div className="audit-row" key={log.id}><div className={'audit-action '+log.action}>{actionLabel(log.action)}</div><div className="audit-main"><b>{log.entityType}: {log.entityName||'Sem identificação'}</b><span><strong>{log.actorName}</strong>{log.actorEmail&&log.actorEmail!==log.actorName?' · '+log.actorEmail:''}</span><small>{new Date(log.createdAt).toLocaleString('pt-BR')}</small></div><button className="edit-icon" onClick={()=>setOpen(open===log.id?null:log.id)}>{open===log.id?'Ocultar':'Detalhes'}</button>{open===log.id&&<div className="audit-details">{log.beforeData&&<div><b>Antes</b><pre>{pretty(log.beforeData)}</pre></div>}{log.afterData&&<div><b>Depois</b><pre>{pretty(log.afterData)}</pre></div>}</div>}</div>)}{!loading&&!loadError&&!filtered.length&&<Empty text={search.trim()?'Nenhum registro encontrado para essa busca.':'Nenhum registro de auditoria encontrado.'}/>}</div></>
}

function MySecurityPage({currentUser,toast}:{currentUser:UserRec|null;toast:(s:string)=>void}){
  const[value,setValue]=useState(3);
  const[unit,setUnit]=useState<'days'|'months'>('months');
  const[defaultValue,setDefaultValue]=useState(3);
  const[defaultUnit,setDefaultUnit]=useState<'days'|'months'>('months');
  const[custom,setCustom]=useState(false);
  const[loading,setLoading]=useState(true);
  const[saving,setSaving]=useState(false);
  const[devices,setDevices]=useState<AuthorizedDevice[]>([]);
  const[devicesLoading,setDevicesLoading]=useState(true);

  const loadDevices=async()=>{
    setDevicesLoading(true);
    try{
      const deviceToken=localStorage.getItem(TRUSTED_2FA_DEVICE_KEY)||'';
      if(deviceToken){
        const info=getDeviceInfo();
        await supabase.rpc('sabado_touch_my_device',{
          p_device_token:deviceToken,
          p_device_name:info.device_name,
          p_browser_name:info.browser_name,
          p_platform_name:info.platform_name
        });
      }
      const{data,error}=await supabase.rpc('sabado_list_my_devices',{p_device_token:deviceToken});
      if(error)return toast(error.message);
      if(!data?.ok)return toast(data?.error||'Não foi possível carregar os dispositivos.');
      setDevices(Array.isArray(data.devices)?data.devices:[]);
    }finally{
      setDevicesLoading(false);
    }
  };

  const load=async()=>{
    setLoading(true);
    try{
      const[{data,error}]=await Promise.all([
        supabase.rpc('sabado_get_my_2fa_interval'),
        loadDevices()
      ]);
      if(error)return toast(error.message);
      if(!data?.ok)return toast(data?.error||'Não foi possível carregar sua configuração.');
      setValue(Number(data.value||3));
      setUnit(data.unit==='days'?'days':'months');
      setDefaultValue(Number(data.default_value||3));
      setDefaultUnit(data.default_unit==='days'?'days':'months');
      setCustom(data.custom===true);
    }finally{
      setLoading(false);
    }
  };

  useEffect(()=>{load()},[]);

  const updateLocalExpiry=(trustedUntil:any)=>{
    if(!trustedUntil)return;
    const until=new Date(trustedUntil).getTime();
    if(!Number.isFinite(until))return;
    if(until<=Date.now()){
      localStorage.removeItem(TRUSTED_2FA_DEVICE_KEY);
      localStorage.removeItem(TRUSTED_2FA_UNTIL_KEY);
      return;
    }
    localStorage.setItem(TRUSTED_2FA_UNTIL_KEY,String(until));
  };

  const save=async()=>{
    const clean=Math.floor(Number(value));
    if(!Number.isFinite(clean)||clean<1)return toast('Informe um período válido.');
    if(unit==='days'&&clean>365)return toast('O máximo é 365 dias.');
    if(unit==='months'&&clean>24)return toast('O máximo é 24 meses.');

    setSaving(true);
    try{
      const deviceToken=localStorage.getItem(TRUSTED_2FA_DEVICE_KEY)||'';
      const{data,error}=await supabase.rpc('sabado_update_my_2fa_interval',{
        p_value:clean,
        p_unit:unit,
        p_device_token:deviceToken
      });
      if(error)return toast(error.message);
      if(!data?.ok)return toast(data?.error||'Não foi possível salvar sua configuração.');
      updateLocalExpiry(data.trusted_until);
      setValue(Number(data.value||clean));
      setUnit(data.unit==='days'?'days':'months');
      setCustom(true);
      await loadDevices();
      toast('Seu período de verificação em duas etapas foi salvo.');
    }finally{
      setSaving(false);
    }
  };

  const useDefault=async()=>{
    if(!confirm('Voltar a usar o período padrão definido pelo Administrador?'))return;
    setSaving(true);
    try{
      const deviceToken=localStorage.getItem(TRUSTED_2FA_DEVICE_KEY)||'';
      const{data,error}=await supabase.rpc('sabado_reset_my_2fa_interval',{p_device_token:deviceToken});
      if(error)return toast(error.message);
      if(!data?.ok)return toast(data?.error||'Não foi possível restaurar o período padrão.');
      updateLocalExpiry(data.trusted_until);
      setValue(Number(data.value||defaultValue));
      setUnit(data.unit==='days'?'days':'months');
      setCustom(false);
      await loadDevices();
      toast('Você voltou a usar o período padrão do sistema.');
    }finally{
      setSaving(false);
    }
  };

  const label=(v:number,u:'days'|'months')=>u==='days'?`${v} dia${v===1?'':'s'}`:`${v} ${v===1?'mês':'meses'}`;
  const fmtAccess=(value:string)=>{
    const d=new Date(value);
    if(Number.isNaN(d.getTime()))return '';
    const now=new Date();
    const sameDay=d.toDateString()===now.toDateString();
    const time=d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    return sameDay?`Hoje às ${time}`:`${d.toLocaleDateString('pt-BR')} às ${time}`;
  };
  const fmtExpiry=(value:string)=>{
    const d=new Date(value);
    if(Number.isNaN(d.getTime()))return '';
    return d.toLocaleDateString('pt-BR');
  };

  const revokeDevice=async(device:AuthorizedDevice)=>{
    const text=device.is_current
      ?'Encerrar o acesso deste dispositivo? Você será desconectado e precisará confirmar a verificação em duas etapas novamente neste navegador.'
      :'Encerrar o acesso deste dispositivo? Ele precisará confirmar a verificação em duas etapas novamente.';
    if(!confirm(text))return;
    const{data,error}=await supabase.rpc('sabado_revoke_my_device',{p_device_id:device.id});
    if(error)return toast(error.message);
    if(!data?.ok)return toast(data?.error||'Não foi possível encerrar o acesso.');

    if(device.is_current){
      localStorage.removeItem(CUSTOM_SESSION_KEY);
      localStorage.removeItem(LOGIN_VALIDITY_KEY);
      localStorage.removeItem(TRUSTED_2FA_DEVICE_KEY);
      localStorage.removeItem(TRUSTED_2FA_UNTIL_KEY);
      await supabase.auth.signOut();
      window.location.href='/';
      return;
    }

    await loadDevices();
    toast('Acesso do dispositivo encerrado.');
  };

  const revokeAll=async()=>{
    if(!confirm('Encerrar todas as sessões e remover a autorização de todos os dispositivos? Todos precisarão confirmar a verificação em duas etapas novamente.'))return;
    const{data,error}=await supabase.rpc('sabado_revoke_all_my_devices');
    if(error)return toast(error.message);
    if(!data?.ok)return toast(data?.error||'Não foi possível encerrar todas as sessões.');
    localStorage.removeItem(CUSTOM_SESSION_KEY);
    localStorage.removeItem(LOGIN_VALIDITY_KEY);
    localStorage.removeItem(TRUSTED_2FA_DEVICE_KEY);
    localStorage.removeItem(TRUSTED_2FA_UNTIL_KEY);
    await supabase.auth.signOut();
    window.location.href='/';
  };

  return <><Title t="Minha Segurança" s="Configure a verificação em duas etapas e acompanhe os aparelhos e navegadores autorizados na sua conta."/>
    <div className="panel my-security-panel">
      <div className="my-security-head"><ShieldCheck size={26}/><div><b>{currentUser?.name||'Minha conta'}</b><span>Verificação em duas etapas ativa</span></div></div>

      {loading?<div className="empty">Carregando sua configuração...</div>:<>
        <div className="security-current-rule"><ShieldCheck size={17}/><span>Seu período atual: <strong>{label(value,unit)}</strong>{custom?' · configuração pessoal':' · usando o padrão do sistema'}.</span></div>

        <div className="two-factor-interval-form">
          <label><span>Solicitar o código novamente a cada</span><input type="number" min="1" max={unit==='days'?365:24} value={value} onChange={e=>setValue(Number(e.target.value))}/></label>
          <label><span>Unidade</span><select value={unit} onChange={e=>setUnit(e.target.value as 'days'|'months')}><option value="days">Dias</option><option value="months">Meses</option></select></label>
        </div>

        <div className="my-security-actions">
          <button className="primary" disabled={saving} onClick={save}><Save size={18}/>{saving?'Salvando...':'Salvar meu período'}</button>
          {custom&&<button className="edit-icon" disabled={saving} onClick={useDefault}>Usar padrão do sistema</button>}
        </div>

        <div className="security-default-info">
          <span>Padrão atual do sistema: <strong>{label(defaultValue,defaultUnit)}</strong>.</span>
          <small>Esta configuração é individual. Alterar seu período não muda o período dos outros professores.</small>
        </div>

        <small className="settings-help">Ao clicar em <strong>Sair</strong>, o navegador continua reconhecido até o seu prazo vencer. O código poderá ser solicitado antes se você limpar os dados do navegador, usar outro aparelho/navegador ou se o Administrador redefinir sua verificação em duas etapas.</small>
      </>}
    </div>

    <div className="panel devices-panel">
      <div className="devices-head">
        <div><h3>Sessões e dispositivos conectados</h3><p>Veja onde sua conta está autorizada e encerre acessos que você não reconhece.</p></div>
        <button className="edit-icon" onClick={loadDevices} disabled={devicesLoading}>Atualizar</button>
      </div>

      {devicesLoading?<div className="empty">Carregando dispositivos...</div>:devices.length? <div className="device-list">
        {devices.map(device=><div className={'device-card '+(device.is_current?'current':'')} key={device.id}>
          <div className="device-icon"><Smartphone size={22}/></div>
          <div className="device-info">
            <div className="device-title"><b>{device.browser_name||'Navegador'} · {device.device_name||device.platform_name||'Dispositivo'}</b>{device.is_current&&<span>Este dispositivo</span>}</div>
            <small>{device.platform_name||'Plataforma não identificada'} · Último acesso: {fmtAccess(device.last_seen_at)}</small>
            <small>Autorizado até {fmtExpiry(device.expires_at)} · {Number(device.active_sessions||0)>0?'Sessão ativa':'Sem sessão ativa'}</small>
          </div>
          <button className="danger-outline device-revoke" onClick={()=>revokeDevice(device)}>Encerrar acesso deste dispositivo</button>
        </div>)}
      </div>:<div className="empty">Nenhum outro dispositivo autorizado encontrado.</div>}

      <div className="devices-footer">
        <button className="danger-outline revoke-all-devices" onClick={revokeAll} disabled={devicesLoading}>Encerrar todas as sessões</button>
        <small>Use esta opção se você perdeu um aparelho ou suspeita que alguém entrou na sua conta.</small>
      </div>
    </div>
  </>
}


function SettingsPage({data,reload,toast}:{data:Data;reload:()=>Promise<void>;toast:(s:string)=>void}){
  const[f,setF]=useState(data.settings);
  const[saving,setSaving]=useState(false);

  const save=async()=>{
    const value=Math.floor(Number(f.twoFactorIntervalValue));
    if(!Number.isFinite(value)||value<1)return toast('Informe um período válido.');
    if(f.twoFactorIntervalUnit==='days'&&value>365)return toast('O máximo é 365 dias.');
    if(f.twoFactorIntervalUnit==='months'&&value>24)return toast('O máximo é 24 meses.');

    setSaving(true);
    try{
      const{error:brandingError}=await supabase.from('sabado_settings').update({
        name:f.name,
        subtitle:f.subtitle,
        updated_at:new Date().toISOString()
      }).eq('id',1);
      if(brandingError)return toast(brandingError.message);

      const{data:security,error:securityError}=await supabase.rpc('sabado_update_2fa_interval',{
        p_value:value,
        p_unit:f.twoFactorIntervalUnit
      });
      if(securityError)return toast(securityError.message);
      if(!security?.ok)return toast(security?.error||'Não foi possível alterar o período da verificação.');

      await reload();
      toast('Configurações salvas. O novo período padrão foi aplicado aos usuários que ainda usam o padrão.');
    }finally{
      setSaving(false);
    }
  };

  const unitLabel=f.twoFactorIntervalUnit==='days'?'dia(s)':'mês(es)';

  return <><Title t="Configurações" s="Personalize o sistema e a segurança dos acessos."/>
    <div className="panel settings-section">
      <h3>Identidade do sistema</h3>
      <div className="form">
        <label><span>Nome do sistema</span><input value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></label>
        <label><span>Subtítulo</span><input value={f.subtitle} onChange={e=>setF({...f,subtitle:e.target.value})}/></label>
      </div>
    </div>

    <div className="panel settings-section security-settings">
      <div className="security-settings-title"><ShieldCheck size={22}/><div><h3>Período padrão da verificação em duas etapas</h3><p>Este período será usado apenas para usuários que ainda não escolheram uma configuração própria em Minha Segurança.</p></div></div>
      <div className="two-factor-interval-form">
        <label><span>Solicitar novamente a cada</span><input type="number" min="1" max={f.twoFactorIntervalUnit==='days'?365:24} value={f.twoFactorIntervalValue} onChange={e=>setF({...f,twoFactorIntervalValue:Number(e.target.value)})}/></label>
        <label><span>Unidade</span><select value={f.twoFactorIntervalUnit} onChange={e=>setF({...f,twoFactorIntervalUnit:e.target.value as 'days'|'months'})}><option value="days">Dias</option><option value="months">Meses</option></select></label>
      </div>
      <div className="security-current-rule"><ShieldCheck size={17}/><span>Padrão do sistema: solicitar o código de verificação a cada <strong>{f.twoFactorIntervalValue} {unitLabel}</strong>.</span></div>
      <small className="settings-help">Cada usuário pode substituir este padrão em <strong>Minha Segurança</strong>. Clicar em Sair não apaga a autorização do navegador.</small>
    </div>

    <button className="primary settings-save" disabled={saving} onClick={save}><Save size={18}/>{saving?'Salvando...':'Salvar configurações'}</button>
  </>
}

function SystemCenterPage(){
  const[info,setInfo]=useState<SystemOverview|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const load=async()=>{
    setLoading(true);setError('');
    const{data,error}=await supabase.rpc('sabado_system_overview');
    if(error){setError(error.message||'Não foi possível carregar as informações do sistema.');setInfo(null)}
    else setInfo(data as SystemOverview);
    setLoading(false);
  };
  useEffect(()=>{load()},[]);
  const fmtDate=(v?:string|null)=>v?new Date(v).toLocaleString('pt-BR'):'Sem registros';
  const trashTotal=info?Object.values(info.trash||{}).reduce((a,b)=>a+Number(b||0),0):0;
  const counts=info?.counts||{};
  return <><div className="section-head"><Title t="Central do Sistema" s="Informações técnicas, armazenamento e situação geral do sistema. Área exclusiva do Super Administrador."/><button className="primary compact-action" onClick={load} disabled={loading}><RefreshCw size={16}/>{loading?' Atualizando...':' Atualizar'}</button></div>
    {error&&<div className="panel system-error"><b>Não foi possível consultar o sistema.</b><span>{error}</span></div>}
    {loading&&!info?<div className="panel">Carregando informações técnicas...</div>:info&&<>
      <div className="system-status-panel panel"><div className="system-status-icon"><Activity size={26}/></div><div><b>Sistema operacional</b><span>Banco de dados conectado e respondendo normalmente.</span><small>Última verificação: {fmtDate(info.checked_at)}</small></div><span className="system-status-badge">ONLINE</span></div>
      <div className="grid system-metrics">
        <div className="card system-metric-card"><Server size={22}/><span>Versão do sistema</span><strong>{info.app_version}</strong><small>Evangelização Infanto Juvenil</small></div>
        <div className="card system-metric-card"><Database size={22}/><span>Tamanho do banco</span><strong>{info.database_size_pretty}</strong><small>Banco completo do projeto</small></div>
        <div className="card system-metric-card"><HardDrive size={22}/><span>Dados do sistema</span><strong>{info.app_tables_size_pretty}</strong><small>Tabelas utilizadas pelo sistema</small></div>
        <div className="card system-metric-card"><Users size={22}/><span>Usuários ativos</span><strong>{info.active_users}</strong><small>{info.two_factor_enabled_users} com 2FA ativo</small></div>
      </div>
      <div className="panel"><div className="annual-students-head"><div><b>Registros armazenados</b><span>Quantidade atual de informações mantidas no banco de dados.</span></div></div><div className="system-count-grid">
        <div><span>Alunos</span><b>{counts.students||0}</b></div><div><span>Professores/usuários</span><b>{counts.users||0}</b></div><div><span>Mães auxiliares</span><b>{counts.mothers||0}</b></div><div><span>Escalas</span><b>{counts.schedules||0}</b></div><div><span>Chamadas</span><b>{counts.attendance||0}</b></div><div><span>Reuniões</span><b>{counts.meetings||0}</b></div><div><span>Eventos</span><b>{counts.events||0}</b></div><div><span>Notificações</span><b>{counts.notifications||0}</b></div><div><span>Registros de auditoria</span><b>{counts.audit_logs||0}</b></div>
      </div></div>
      <div className="system-detail-grid">
        <div className="panel system-detail-card"><ShieldCheck size={22}/><div><b>Segurança</b><span>Usuários com verificação em duas etapas</span><strong>{info.two_factor_enabled_users} de {counts.users||0}</strong></div></div>
        <div className="panel system-detail-card"><Trash2 size={22}/><div><b>Lixeira</b><span>Registros aguardando restauração ou limpeza</span><strong>{trashTotal}</strong></div></div>
        <div className="panel system-detail-card"><CalendarDays size={22}/><div><b>Anos encerrados</b><span>Períodos congelados pelo fechamento anual</span><strong>{info.closed_academic_years}</strong></div></div>
        <div className="panel system-detail-card"><History size={22}/><div><b>Última atividade auditada</b><span>Último registro gravado na Auditoria</span><strong className="system-small-value">{fmtDate(info.last_audit_at)}</strong></div></div>
      </div>
      <div className="panel system-technical"><b>Informações técnicas</b><div><span>Banco de dados</span><strong>{info.database_name}</strong></div><div><span>PostgreSQL</span><strong>{info.postgres_version}</strong></div><div><span>Horário do servidor</span><strong>{fmtDate(info.database_time)}</strong></div><div><span>Conexão</span><strong>Supabase conectado</strong></div></div>
    </>}
  </>;
}

function AdminPage({data,setPage,selectedYear}:{data:Data;setPage:(p:string)=>void;selectedYear:number}){return <><div className="hero"><p>Área exclusiva</p><h1>Painel do Administrador</h1><span>{ADMIN_EMAIL}</span></div><div className="grid"><Card t="Alunos" v={data.students.length}/><Card t="Professores" v={data.users.length}/><Card t={`Chamadas ${selectedYear}`} v={data.attendance.filter(a=>recordYear(a.date)===selectedYear).length}/><Card t="Notificações" v={data.notifications.length}/></div><div className="panel admin-links"><button className="primary" onClick={()=>setPage('users')}>Professores e Acessos</button><button className="primary" onClick={()=>setPage('history')}>Histórico de Chamadas</button><button className="primary" onClick={()=>setPage('audit')}>Registro de Auditoria</button><button className="primary" onClick={()=>setPage('system-center')}>Central do Sistema</button><button className="primary" onClick={()=>setPage('settings')}>Configurações</button></div></>}

const Card=({t,v}:{t:string;v:any})=><div className="card"><span>{t}</span><strong>{v}</strong></div>;
const Title=({t,s}:{t:string;s:string})=><div className="title"><h1>{t}</h1><p>{s}</p></div>;
const Empty=({text}:{text:string})=><div className="empty">{text}</div>;
function Modal({title,close,children}:{title:string;close:()=>void;children:any}){return <div className="modal-backdrop"><div className="modal-card"><div className="modal-title"><h3>{title}</h3><button onClick={close}><X/></button></div>{children}</div></div>}
export default App;