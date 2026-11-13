(function(){
'use strict';
var $=function(s,r){return (r||document).querySelector(s)};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
var kr=function(n){return Math.round(n).toLocaleString('sv-SE').replace(/ /g,' ')+' kr'};
var pad=function(n){return (n<10?'0':'')+n};
var iso=function(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
var D=function(s){return new Date(s+'T00:00:00')};
var WD=['sön','mån','tis','ons','tors','fre','lör'],WDL=['söndag','måndag','tisdag','onsdag','torsdag','fredag','lördag'];
var MON=['jan','feb','mars','april','maj','juni','juli','aug','sep','okt','nov','dec'];
var nice=function(s){var d=D(s);return WD[d.getDay()]+' '+d.getDate()+' '+MON[d.getMonth()]};
var ic=function(n){return '<svg class="i"><use href="#i-'+n+'"/></svg>'};
var now=new Date(),TODAY=iso(now);

/* ---------- catalogue ---------- */
var SERVICES=[
 {id:'skifte',name:'Hjulskifte',desc:'Vi skiftar till dina egna hjul, kollar lufttryck och mäter mönsterdjup.',mins:30,price:250},
 {id:'montering',name:'Montering och balansering',desc:'Nya däck på dina fälgar, balanserade och klara att rulla.',mins:60,price:600},
 {id:'punktering',name:'Punktering',desc:'Vi lagar om det går. Annars hjälper vi dig till ett nytt däck på en gång.',mins:30,price:300},
 {id:'hjulinst',name:'Hjulinställning',desc:'Rätt vinklar ger jämnt slitage och en bil som går rakt.',mins:60,price:1195},
 {id:'hotell',name:'Däckhotell',desc:'Förvaring en säsong, med skifte vår eller höst.',mins:30,price:895,unit:'per säsong'},
 {id:'lyktor',name:'Lyktpolering',desc:'Våtslip och polering av strålkastarna. Bättre sikt i mörkret.',mins:60,price:1500},
 {id:'ac',name:'AC-service',desc:'Påfyllning och kontroll så att kylan och avfuktningen fungerar.',mins:60,price:995},
 {id:'olja',name:'Oljebyte',desc:'Ny olja och nytt filter, anpassat efter din motor.',mins:60,price:1295,from:true},
 {id:'nyadack',name:'Nya däck och fälgar',desc:'Vi tar fram däck och fälgar som passar bilen och ger dig ett pris innan du bestämmer dig.',mins:60,price:null},
 {id:'verkstad',name:'Service och reparation',desc:'Service, felsökning och reparationer. Berätta vad det gäller så får du ett pris innan vi börjar.',mins:120,price:null}
];
var svc=function(id){return SERVICES.filter(function(s){return s.id===id})[0]};
var pTxt=function(s){return s.price?(s.from?'från ':'')+kr(s.price):'Offert'};
var WS=[185,195,205,215,225,235],PS=[40,45,50,55,60,65],RS=[15,16,17,18];
var TYPES=[['sommar','Sommar'],['friktion','Dubbfritt'],['dubb','Dubbat']];
var typeName=function(t){return TYPES.filter(function(x){return x[0]===t})[0][1]};
var PRODUCTS=[
 {id:'p1',brand:'Kumho',model:'WinterCraft Ice Wi32',type:'dubb',base:1095},
 {id:'p2',brand:'Vredestein',model:'Wintrac Ice',type:'dubb',base:1345},
 {id:'p3',brand:'Kumho',model:'WinterCraft Ice Wi52',type:'friktion',base:1045},
 {id:'p4',brand:'Vredestein',model:'Wintrac Pro',type:'friktion',base:1395},
 {id:'p5',brand:'Kumho',model:'Ecsta HS52',type:'sommar',base:945},
 {id:'p6',brand:'Kumho',model:'Ecowing ES31',type:'sommar',base:845},
 {id:'p7',brand:'Vredestein',model:'Ultrac',type:'sommar',base:1195}
];
var prod=function(id){return PRODUCTS.filter(function(p){return p.id===id})[0]};
var price=function(p,dim){var m=dim.match(/(\d+)\/\d+ R(\d+)/);return Math.round(p.base*(1+(+m[2]-16)*.11+(+m[1]-205)*.004)/5)*5};
var stockOf=function(k){if(S.stock[k]==null){var h=0;for(var i=0;i<k.length;i++)h=(h*31+k.charCodeAt(i))%97;S.stock[k]=[12,8,4,16,0,20,6,8][h%8]}return S.stock[k]};
var FIT=600;

/* ---------- time ---------- */
var closeHour=function(dateIso){return D(dateIso).getDay()===5?16:17};
var isOpenDay=function(d){var g=d.getDay();return g>0&&g<6};
var workdays=function(n){var out=[],d=D(TODAY);while(out.length<n){if(isOpenDay(d))out.push(iso(d));d.setDate(d.getDate()+1)}return out};
var toMin=function(t){return +t.slice(0,2)*60+ +t.slice(3)};
var toT=function(m){return pad(Math.floor(m/60))+':'+pad(m%60)};
var daySlots=function(dateIso){var o=[];for(var m=420;m<closeHour(dateIso)*60;m+=30)o.push(toT(m));return o};
var load=function(dateIso){var c={};S.bookings.forEach(function(b){if(b.date!==dateIso)return;for(var m=toMin(b.time);m<toMin(b.time)+b.mins;m+=30)c[toT(m)]=(c[toT(m)]||0)+1});return c};
var slotFree=function(dateIso,t,mins,c){var s=toMin(t);if(s+mins>closeHour(dateIso)*60)return false;
  if(dateIso===TODAY&&s<=now.getHours()*60+now.getMinutes())return false;
  for(var m=s;m<s+mins;m+=30)if((c[toT(m)]||0)>=2)return false;return true};

/* ---------- state ---------- */
var KEY='nk-demo-v5',S;
var QS=[['Däckskifte','skifte'],['Däckhotell','hotell'],['Nya däck och fälgar','nyadack'],['Bilservice','verkstad']];
function seed(){
  var r=20261112;var rnd=function(){r=(r*1103515245+12345)&0x7fffffff;return r/0x7fffffff};
  var names=['Exempel Andersson','Exempel Bergström','Exempel Carlsson','Exempel Dahl','Exempel Eriksson','Exempel Forsberg','Exempel Gustavsson','Exempel Holm','Exempel Isaksson','Exempel Jonsson','Exempel Karlberg','Exempel Lindh'];
  var cars=['Volvo V60','Volkswagen Golf','Toyota RAV4','Kia Ceed','Volvo XC60','Skoda Octavia','Tesla Model 3','Saab 9-3','Audi A4','Ford Transit','Volvo V70','Volkswagen Caddy'];
  var L='ABCDEFGHJKLMNPRSTUWXYZ';
  var customers=names.map(function(n,i){
    var reg=L[(i*5)%22]+L[(i*3+7)%22]+L[(i*11+2)%22]+' '+pad((10+i*7)%100)+L[(i*2+4)%22];
    return {id:'c'+(i+1),name:n,phone:'070-174 06 '+pad(10+i),since:2012+i%13,cars:[{reg:reg,model:cars[i]}],
      hotel:i%3===0?null:{pos:'ABC'[i%3]+' '+(4+i*3),tyres:i%2?'Sommarhjul':'Vinterhjul',depth:(3.5+((i*7)%40)/10).toFixed(1)}};
  });
  S={customers:customers,bookings:[],orders:[],stock:{},cart:[],seq:2412,oseq:1088};
  var days=workdays(6),nowM=now.getHours()*60+now.getMinutes();
  days.forEach(function(day,di){
    var n=di===0?7:4+Math.floor(rnd()*3);
    for(var k=0;k<n;k++){
      var c=customers[Math.floor(rnd()*customers.length)],s=SERVICES[Math.floor(rnd()*SERVICES.length)];
      var sl=daySlots(day),t=sl[Math.floor(rnd()*sl.length)],cnt=load(day),ok=true,m;
      if(toMin(t)+s.mins>closeHour(day)*60)continue;
      for(m=toMin(t);m<toMin(t)+s.mins;m+=30)if((cnt[toT(m)]||0)>=2)ok=false;
      if(!ok)continue;
      var st='Bekräftad';
      if(day===TODAY){st=toMin(t)+s.mins<=nowM?'Klar':(toMin(t)<=nowM?'Pågår':'Bekräftad')}
      else if(rnd()<.2)st='Ny';
      S.bookings.push({id:'NK-'+(S.seq++),custId:c.id,reg:c.cars[0].reg,model:c.cars[0].model,svc:s.id,mins:s.mins,date:day,time:t,status:st,note:'',src:'Telefon'});
    }
  });
  var d1='205/55 R16',d2='225/45 R17';
  S.orders.push({id:'W-'+(S.oseq++),custId:'c4',date:TODAY,items:[{pid:'p1',dim:d1,qty:4}],fit:true,total:4*price(prod('p1'),d1)+FIT,status:'Väntar på montering'});
  S.orders.push({id:'W-'+(S.oseq++),custId:'c9',date:TODAY,items:[{pid:'p4',dim:d2,qty:4}],fit:false,total:4*price(prod('p4'),d2),status:'Klar att hämta'});
}
function save(){try{localStorage.setItem(KEY,JSON.stringify({d:TODAY,S:S}))}catch(e){}}
function init(){try{var j=JSON.parse(localStorage.getItem(KEY));if(j&&j.d===TODAY&&j.S){S=j.S;return}}catch(e){}seed()}
init();
var cust=function(id){return S.customers.filter(function(c){return c.id===id})[0]};

/* ---------- 3D wheel ---------- */
var wheel=null,G={},onScrollFns=[];
var clamp=function(x){return x<0?0:x>1?1:x},smooth=function(x){x=clamp(x);return x*x*(3-2*x)},mix=function(a,b,t){return a+(b-a)*t};
function measure(){
  var dm=document.querySelector('.demo').offsetHeight;document.documentElement.style.setProperty('--demo-h',dm+'px');
  var st=document.querySelector('.stage').getBoundingClientRect(),sy=window.scrollY,story=$('#story'),pin=document.querySelector('.pin');
  G={dm:dm,sTop:st.top+sy,sH:st.height,sL:st.left,sW:st.width,S0:story.offsetTop-dm,L:Math.max(1,story.offsetHeight-pin.offsetHeight),pinH:pin.offsetHeight};
}
function prog(){var y=window.scrollY;return {q:smooth((y-G.S0*.12)/(G.S0*.88)),p:clamp((y-G.S0)/G.L),y:y}}
var FOC={tread:{yaw:-1.28,s:1.3,dx:.16,dy:0,cam:.1},sidewall:{yaw:-.36,s:1.5,dx:0,dy:.42,cam:.04},rim:{yaw:-.22,s:1.28,dx:0,dy:.03,cam:.1}};
function pose(){
  if($('#site').hidden)return null;
  var vw=window.innerWidth,m=vw<900,g=prog(),p=g.p,q=g.q;
  if(g.y>G.S0+G.L+window.innerHeight)return null;
  var hx=m?vw*.6:G.sL+G.sW*.5,hy=G.sTop+G.sH*(m?.46:.46)-g.y,hd=m?Math.min(G.sH*.98,vw*.78):Math.min(G.sH*.72,G.sW*.8);
  if(m&&(FOCUS||SCAN==='done')&&q<.25){var ch=($('#gcard').offsetHeight||210)+96,ah=window.innerHeight-G.dm-ch;hx=vw*.5;hy=G.dm+ah*.52;hd=Math.min(vw*.74,ah*.8)}
  if(FOCUS&&q<.25){var fo=FOC[FOCUS];return {active:true,lock:true,x:hx+hd*fo.dx,y:hy+hd*fo.dy,d:hd*fo.s,yaw:fo.yaw,pitch:0,cam:fo.cam,floor:1,temp:0,snow:0,spin:.06,e:0,f:1}}
  if(SCAN&&q<.25)return {active:true,lock:true,x:hx,y:hy,d:hd*(SCAN==='done'?.92:1.04),yaw:-1.08,pitch:0,cam:.15,floor:1,temp:0,snow:0,spin:.25,e:0,f:1};
  var sx=m?vw*.5:vw*.66,sy=G.dm+G.pinH*(m?.33:.5),sd=m?Math.min(vw*.6,G.pinH*.3):G.pinH*.44;
  var e=smooth((p-.37)/.1)*(1-smooth((p-.93)/.07))*(q>.98?1:0),f=1+smooth((p-.65)/.07);
  sd*=1+.4*clamp(f-1)*(1-smooth((p-.93)/.07));
  var c=1-smooth((p-.27)/.1),cx=m?vw*.5:vw*.66,cy=G.dm+G.pinH*(m?.34:.5),cd=G.pinH*(m?1.85:2.1);
  var win=SEASON==='sommar'?0:SEASON==='dubb'?1:.5,tS=mix(.45,SEASON==='sommar'?.1:SEASON==='dubb'?1:.82,c);
  if(typing&&m)return {active:true,x:vw*.5,y:typeY,d:Math.min(190,vw*.5),yaw:-.25,pitch:.1,e:0,f:1,spin:.5,floor:0,temp:.45};
  return {active:true,x:mix(hx,mix(sx,cx,c),q),y:mix(hy,mix(sy,cy,c),q),d:mix(hd,mix(sd,cd,c),q),
    yaw:mix(-.62,mix(m?.35:mix(.95,.8,clamp(f-1)),-1.5,c),q),pitch:mix(0,mix(m?-.95:.14,0,c),q),e:e,f:f,
    spin:mix(.3,mix(.12,.2,c),q),temp:tS*q,snow:q*c*win,floor:1-smooth(q/.45),cam:.15*(1-q)};
}
/* hotspots and spec badges follow points on the 3D wheel */
var HS=[].slice.call(document.querySelectorAll('.hs')),BG=[].slice.call(document.querySelectorAll('.badge')),BADGES=false,hotOn=false,bornAt=performance.now();
function hotLoop(){
  if(hotOn||!wheel)return;hotOn=true;
  (function run(){
    var y=window.scrollY,near=y<G.S0*.5&&!$('#site').hidden;
    var show=near&&y<30&&!FOCUS&&!SCAN&&performance.now()-bornAt>2600;
    for(var i=0;i<3;i++){var nm=HS[i].dataset.v,pt=near?wheel.project(nm):null;
      HS[i].classList.toggle('on',!!(show&&pt));if(pt){HS[i].style.transform='translate3d('+pt.x.toFixed(1)+'px,'+pt.y.toFixed(1)+'px,0)';
        var off=nm==='tread'?[-18,-44]:nm==='sidewall'?[14,-40]:[18,6],bx=Math.max(8,Math.min(window.innerWidth-BG[i].offsetWidth-8,pt.x+off[0]-(nm==='tread'?BG[i].offsetWidth*.5:0)));
        BG[i].style.transform='translate3d('+bx.toFixed(1)+'px,'+(pt.y+off[1]).toFixed(1)+'px,0)'}
      BG[i].classList.toggle('on',!!(BADGES&&near&&pt&&y<30))}
    if(near)requestAnimationFrame(run);else{hotOn=false;HS.forEach(function(h){h.classList.remove('on')});BG.forEach(function(b){b.classList.remove('on')})}
  })();
}
onScrollFns.push(function(){if(window.scrollY>40&&(FOCUS||SCAN))closeCard();if(!hotOn&&window.scrollY<10)hotLoop()});
var HOT={tread:['Däckbyte','Vi skiftar hjulen, kollar lufttrycket och mäter mönsterdjupet medan du tar en kaffe.','skifte'],
  sidewall:['Balansering','Nya däck monteras och balanseras så att ratten ligger still i alla farter.','montering'],
  rim:['Däckhotell','Vi förvarar dina hjul över säsongen och säger till när det är dags att byta.','hotell']};
function card(html){if(wheel)document.body.classList.add('inspect');var g=$('#gcard');g.innerHTML=html+'<button class="x" data-act="cardx" aria-label="Stäng">'+ic('x')+'</button>';g.classList.add('on')}
function closeCard(){FOCUS=null;SCAN=null;BADGES=false;document.body.classList.remove('inspect');$('#gcard').classList.remove('on')}
function openHot(v){var h=HOT[v],sv2=svc(h[2]);FOCUS=v;SCAN=null;BADGES=false;
  card('<h3 class="d">'+h[0]+'</h3><p>'+h[1]+'</p><p class="pricetag">'+pTxt(sv2)+(sv2.unit?' '+sv2.unit:'')+(sv2.id==='lyktor'?'':', exempelpris')+'</p><div class="acts"><button class="btn sm" data-act="book" data-svc="'+h[2]+'"><span>Boka '+h[0].toLowerCase()+'</span></button></div>')}
/* reg-nummer: laser scan, then badges and a result card */
var DL=[[205,55,16],[195,65,15],[225,45,17],[215,55,17],[215,60,16],[225,50,17],[235,45,18]];
function nextFree(mins){var ds=workdays(10);for(var i=0;i<ds.length;i++){var c=load(ds[i]),sl=daySlots(ds[i]);for(var j=0;j<sl.length;j++)if(slotFree(ds[i],sl[j],mins,c))return [ds[i],sl[j]]}return null}
function runScan(){
  var inp=$('#heroReg'),raw=inp.value.toUpperCase().replace(/[^A-Z0-9ÅÄÖ]/g,''),pl=$('#regPlate');
  if(raw.length<5){pl.classList.remove('bad');void pl.offsetWidth;pl.classList.add('bad');inp.focus();return}
  REG=raw.replace(/^(.{3})/,'$1 ');inp.value=REG;inp.blur();closeCard();
  var h=0;for(var i=0;i<raw.length;i++)h=(h*31+raw.charCodeAt(i))%9973;var d=DL[h%DL.length];
  var done=function(){
    pl.classList.remove('scanning');F.w=d[0];F.p=d[1];F.r=d[2];renderSize();renderTyres();
    var dim=dimStr(),n=PRODUCTS.filter(function(p){return p.type===F.type&&stockOf(p.id+'|'+dim)>=4}).length,nf=nextFree(30);
    BG[0].firstChild.innerHTML='Dimension <b>'+dim+'</b>';BG[1].firstChild.innerHTML='I lager <b>'+n+' '+(n===1?'modell':'modeller')+'</b>';BG[2].firstChild.innerHTML='Nästa tid <b>'+(nf?nice(nf[0])+' '+nf[1]:'ring oss')+'</b>';
    BADGES=true;SCAN='done';hotLoop();
    card('<h3 class="d">'+esc(REG)+'</h3><p>Vi föreslår '+dim+'. I demon är dimensionen ett exempel, i skarp drift hämtas den från regnumret.</p><div class="acts"><button class="btn sm" data-act="scanbook"><span>Boka däckbyte</span></button><a class="btn sm line" href="#dack" data-act="cardx"><span>Se däcken</span></a></div>');
  };
  if(!wheel||RM){done();return}
  SCAN='run';pl.classList.remove('scanning');void pl.offsetWidth;pl.classList.add('scanning');window.scrollTo({top:0,behavior:'smooth'});wheel.scan(done);
}
$('#plateform').addEventListener('submit',function(e){e.preventDefault();runScan()});
var CAPS=[].slice.call(document.querySelectorAll('.cap')),GH=[].slice.call(document.querySelectorAll('.ghost span')),TK=[].slice.call(document.querySelectorAll('.ticks i')),typing=0,typeY=0;
function storyUI(){
  var g=prog(),on=g.q>.9&&g.p<.999,i=g.p<.32?0:g.p<.66?1:2,cuts=[.02,.32,.66,.96];
  CAPS.forEach(function(c,k){c.classList.toggle('on',on&&k===i)});
  GH.forEach(function(c,k){c.classList.toggle('on',on&&k===i&&g.p>.03)});
  TK.forEach(function(c,k){c.style.setProperty('--v',clamp((g.p-cuts[k])/(cuts[k+1]-cuts[k])).toFixed(3))});
}
function startWheel(){
  measure();
  try{wheel=window.NKWheel&&window.NKWheel.mount($('#wheel'),{pose:pose,season:SEASON})}catch(e){wheel=null}
  if(!wheel){document.documentElement.classList.add('nogl');return}
  wheel.bindDrag($('#dragHero'));wheel.bindDrag($('#dragStory'));
  var dh=$('#dragHero'),revOff=function(){revving=false;wheel.rev(false)};
  dh.addEventListener('pointerdown',function(){revving=true;wheel.rev(true);smokeLoop()});dh.addEventListener('pointerup',revOff);dh.addEventListener('pointercancel',revOff);dh.addEventListener('pointerleave',revOff);
  ['dragHero','dragStory'].forEach(function(id){$('#'+id).addEventListener('pointerdown',function(){$('#hint').classList.add('gone')},{once:true})});
  var tt=$('#tyreText'),pin=document.querySelector('.pin');
  tt.addEventListener('focus',function(){if(window.innerWidth>=900)return;pin.classList.add('typing');document.documentElement.classList.add('tw');requestAnimationFrame(function(){var r=CAPS[1].getBoundingClientRect();typeY=r.bottom+112;typing=1})});
  var tyT;tt.addEventListener('blur',function(){clearTimeout(tyT);tyT=setTimeout(function(){if(document.activeElement===tt)return;typing=0;pin.classList.remove('typing');document.documentElement.classList.remove('tw')},320)});
  tt.addEventListener('keydown',function(e){if(e.key==='Enter')tt.blur()});
  onScrollFns.push(storyUI);hotLoop();
  window.addEventListener('resize',function(){measure();storyUI()});storyUI();
}
if(document.fonts&&document.fonts.load){Promise.all([document.fonts.load('italic 900 64px Archivo'),document.fonts.load('700 40px Archivo')]).then(startWheel,startWheel)}else startWheel();

/* ---------- customer site ---------- */
var F={w:205,p:55,r:16,type:'friktion'},openSvc=null,SEASON='friktion',REG='',FOCUS=null,SCAN=null;
var dimStr=function(){return F.w+'/'+F.p+' R'+F.r};
function renderServices(){
  $('#services').innerHTML=SERVICES.map(function(s){
    var o=openSvc===s.id;
    return '<div class="svc-row'+(o?' open':'')+'"><button class="svc-head" data-act="svc" data-v="'+s.id+'" aria-expanded="'+o+'"><span class="n">'+s.name+'</span><span class="p">'+pTxt(s)+'</span><span class="plus" aria-hidden="true"></span></button>'+
      '<div class="svc-body"><div><div class="svc-in"><p>'+s.desc+' Tar cirka '+s.mins+' minuter.'+(s.unit?' Priset gäller '+s.unit+'.':'')+'</p><button class="btn sm ink" data-act="book" data-svc="'+s.id+'" '+(o?'':'tabindex="-1"')+'><span>Boka '+s.name.toLowerCase()+'</span></button></div></div></div></div>';
  }).join('');
}
var FEAT=[['skifte','Däckskifte','Byte till dina egna hjul, lufttryck och mönsterdjup.'],['hotell','Däckhotell','Vi förvarar hjulen och skiftar vår och höst.'],['hjulinst','Hjulinställning','Rätt vinklar ger jämnt slitage och en bil som går rakt.'],['verkstad','Service och reparation','Felsökning och reparationer. Pris innan vi börjar.']];
function renderCards(){
  $('#scards').innerHTML=FEAT.map(function(f){var s2=svc(f[0]);return '<article class="scard"><h4>'+f[1]+'</h4><p>'+f[2]+'</p><div class="pm"><b>'+pTxt(s2)+'</b><span>'+(s2.unit?s2.unit:'cirka '+s2.mins+' min')+'</span></div><button class="btn sm" data-act="book" data-svc="'+f[0]+'"><span>Boka</span></button></article>'}).join('');
  $('#qsvc').innerHTML=QS.map(function(q){return '<button type="button" data-act="qpick" data-v="'+q[1]+'" aria-pressed="'+(QV===q[1])+'">'+q[0]+'</button>'}).join('');
}
var QV='skifte';
function renderSize(dir,which){
  var dg=function(k,label){return '<div class="digit"><button data-act="step" data-k="'+k+'" data-d="1" aria-label="Öka '+label+'">'+ic('up')+'</button><span class="v"><b class="'+(which===k?(dir>0?'up':'dn'):'')+'">'+F[k]+'</b></span><button data-act="step" data-k="'+k+'" data-d="-1" aria-label="Minska '+label+'">'+ic('dn')+'</button></div>'};
  $('#size').innerHTML=dg('w','bredd')+'<span class="sep">/</span>'+dg('p','profil')+'<span class="sep">R</span>'+dg('r','fälgstorlek');
}
function renderSeason(){
  var i=TYPES.map(function(t){return t[0]}).indexOf(SEASON);
  [].forEach.call(document.querySelectorAll('[data-season]'),function(el){
    if(!el.firstChild)el.innerHTML='<i></i>'+TYPES.map(function(t){return '<button data-act="season" data-v="'+t[0]+'">'+t[1]+'</button>'}).join('');
    el.style.setProperty('--i',i);[].forEach.call(el.querySelectorAll('button'),function(b){b.setAttribute('aria-pressed',b.dataset.v===SEASON)});
  });
}
function setSeason(v){if(v===SEASON)return;SEASON=v;F.type=v;if(wheel)wheel.setSeason(v);if(car)car.setSeason(v);renderSeason();renderTyres();if(window.renderCfg)renderCfg()}
function renderTyres(){
  var dim=dimStr();
  $('#tyres').innerHTML=PRODUCTS.filter(function(p){return p.type===F.type}).map(function(p){
    var st=stockOf(p.id+'|'+dim),pr=price(p,dim);
    return '<article class="tcard"><div class="tread '+p.type+'"><i></i><span>'+typeName(p.type)+'</span></div><div class="tbody"><div><div class="m">'+p.brand+' '+p.model+'</div><div class="s'+(st>0&&st<5?' low':'')+'">'+dim+'. '+(st>=4?(st<5?'Bara '+st+' kvar i lager':st+' i lager'):'Beställs hem på 2 till 3 dagar')+'</div></div>'+
      '<div class="pr">'+kr(pr)+'<small>4 st '+kr(pr*4)+'</small></div>'+
      '<button class="btn sm ink" data-act="add" data-pid="'+p.id+'"><span>Lägg 4 i varukorgen</span></button></div><i class="glare"></i></article>';
  }).join('');
  setCart();
}
function setCart(){var n=S.cart.reduce(function(a,i){return a+i.qty},0),e=$('#cartn'),bm=$('#barMain');e.textContent=n;e.setAttribute('data-n',n);
  bm.dataset.act=n?'cart':'book';bm.innerHTML='<span>'+(n?ic('cart')+'Varukorg ('+n+')':'Boka tid')+'</span>'}
function renderStatic(){
  var hrs=[['Måndag',1,'07–17'],['Tisdag',2,'07–17'],['Onsdag',3,'07–17'],['Torsdag',4,'07–17'],['Fredag',5,'07–16'],['Lördag',6,'Stängt'],['Söndag',0,'Stängt']];
  $('#hours').innerHTML=hrs.map(function(h){return '<tr class="'+(h[1]===now.getDay()?'today':'')+'"><td>'+h[0]+'</td><td>'+h[2]+'</td></tr>'}).join('');
  var m=now.getHours()*60+now.getMinutes(),open=isOpenDay(now)&&m>=420&&m<closeHour(TODAY)*60,el=$('#openNow');
  if(open){el.textContent='Öppet nu, till klockan '+closeHour(TODAY);el.className='status open'}
  else{var nx=D(TODAY);if(!(isOpenDay(now)&&m<420))do{nx.setDate(nx.getDate()+1)}while(!isOpenDay(nx));
    el.textContent='Stängt just nu. Öppnar '+(iso(nx)===TODAY?'idag':'på '+WDL[nx.getDay()])+' klockan 7';el.className='status closed'}
  $('#todayHours').textContent=isOpenDay(now)?'07 till '+closeHour(TODAY):'Stängt';
}

/* ---------- booking / checkout sheet ---------- */
var W=null;
var RM=window.matchMedia('(prefers-reduced-motion: reduce)').matches,closeT=null,lastFocus=null;
function vt(fn){if(document.startViewTransition&&!RM){try{var t=document.startViewTransition(fn),no=function(){};t.ready.catch(no);t.finished.catch(no);t.updateCallbackDone.catch(no);return}catch(e){}}fn()}
function openFlow(kind,o){
  o=o||{};clearTimeout(closeT);
  var sc=$('#scrim');sc.classList.remove('out');$('#sheet').innerHTML='';
  W={kind:kind,cfg:o.cfg||null,i:0,shown:-1,svc:o.svc||null,extras:o.extras||[],reg:o.reg||REG||'',model:'',date:null,time:null,name:'',phone:'',note:'',fit:true,err:'',result:null};
  W.steps=kind==='order'?['cart','time','details','done']:kind==='quick'?['quick','time','details','done']:['service','car','time','details','done'];
  if(kind==='booking'&&W.svc)W.i=W.reg.replace(/\s/g,'').length>=5?2:1;
  lastFocus=document.activeElement;document.documentElement.style.overflow='hidden';
  sc.classList.add('on');renderSheet();
}
function closeFlow(){
  if(!W)return;W=null;var sc=$('#scrim');sc.classList.add('out');document.documentElement.style.overflow='';
  closeT=setTimeout(function(){sc.classList.remove('on','out');$('#sheet').innerHTML=''},RM?0:190);
  if(lastFocus&&lastFocus.focus)try{lastFocus.focus({preventScroll:true})}catch(e){}
}
function cartTotal(){return S.cart.reduce(function(a,i){return a+price(prod(i.pid),i.dim)*i.qty},0)}
function flowMins(){return W.kind==='order'?60:svc(W.svc).mins}
function hubSvg(doneN,all){
  var s='<svg class="hub'+(all?' done':'')+'" viewBox="0 0 56 56" aria-hidden="true"><circle class="ring" cx="28" cy="28" r="25"/><circle cx="28" cy="28" r="5" fill="currentColor"/>';
  for(var k=0;k<5;k++){var a=-Math.PI/2+k*Math.PI*2/5,x=28+Math.cos(a)*15,y=28+Math.sin(a)*15,p=[];
    for(var j=0;j<6;j++){var b=j*Math.PI/3;p.push((x+Math.cos(b)*5.4).toFixed(1)+','+(y+Math.sin(b)*5.4).toFixed(1))}
    s+='<polygon class="nut'+(k<doneN?' on':'')+'" points="'+p.join(' ')+'"/>'}
  return s+'</svg>';
}
function renderSheet(){
  var st=W.steps[W.i],b='',title='',next='Fortsätt',canBack=W.i>0&&st!=='done';
  var total=W.steps.length-1,nuts=st==='done'?5:Math.round(W.i/total*5);
  if(st==='service'){title='Vad gäller det?';
    b=SERVICES.map(function(s){return '<button class="opt" data-act="pick" data-v="'+s.id+'" aria-pressed="'+(W.svc===s.id)+'"><b>'+s.name+'</b><em>'+pTxt(s)+'</em><span>Cirka '+s.mins+' min</span></button>'}).join('');
  }
  if(st==='quick'){title=W.cfg?'Boka med ditt val':'Snabboffert';
    b=(W.cfg?'<div class="cfgsum"><b>'+esc(W.cfg.rim)+' fälg, '+esc(W.cfg.tyre.toLowerCase())+'</b><span>Valt i 3D-vyn. Lacken är bara för att se helheten.</span></div>':'')+
      '<label class="field"><span>Regnummer</span><div class="reg"><i></i><input id="fReg" value="'+esc(W.reg)+'" maxlength="7" placeholder="ABC 123" autocomplete="off" autocapitalize="characters"></div></label>'+
      '<span class="flab">Vad gäller det?</span><div class="qopts">'+QS.map(function(q){var s2=svc(q[1]);return '<button class="opt" data-act="pick" data-v="'+q[1]+'" aria-pressed="'+(W.svc===q[1])+'"><b>'+q[0]+'</b><span>'+pTxt(s2)+'</span></button>'}).join('')+'</div>';
  }
  if(st==='car'){title='Vilken bil?';
    b='<label class="field"><span>Regnummer</span><div class="reg"><i></i><input id="fReg" value="'+esc(W.reg)+'" maxlength="7" placeholder="ABC 123" autocomplete="off"></div></label>'+
      '<label class="field"><span>Bilmodell (frivilligt)</span><input id="fModel" value="'+esc(W.model)+'" placeholder="Till exempel Volvo V60"></label>'+
      '<p class="small" style="color:var(--smoke)">I den skarpa versionen hämtas modell och däckdimension automatiskt från regnumret.</p>';
  }
  if(st==='cart'){title='Varukorgen';
    if(!S.cart.length){b='<p style="color:var(--smoke)">Här är det tomt. Ställ in din dimension under Köp däck och lägg till däcken du vill ha.</p>';next=null}
    else{b=S.cart.map(function(it,k){var p=prod(it.pid);return '<div class="citem"><div><b>'+p.brand+' '+p.model+'</b><div class="small" style="color:var(--smoke)">'+it.dim+', '+typeName(p.type).toLowerCase()+'</div></div><div style="text-align:right;font-weight:800">'+kr(price(p,it.dim)*it.qty)+'</div>'+
        '<div class="qty"><button data-act="qty" data-k="'+k+'" data-d="-1" aria-label="Minska antal">−</button><span>'+it.qty+' st</span><button data-act="qty" data-k="'+k+'" data-d="1" aria-label="Öka antal">+</button></div><div></div></div>'}).join('')+
      '<label class="check"><input type="checkbox" id="fFit" '+(W.fit?'checked':'')+'><span><b>Montering och balansering, '+kr(FIT)+'</b><br><span class="small" style="color:var(--smoke)">Du väljer tid i nästa steg. Utan montering hämtar du däcken i verkstaden.</span></span></label>'+
      '<div class="sum"><div class="tot"><span>Betalas i verkstaden</span><span>'+kr(cartTotal()+(W.fit?FIT:0))+'</span></div></div>';
    }
  }
  if(st==='time'){title=W.kind==='order'?'När ska vi montera?':'Välj en tid';
    var days=workdays(10);if(!W.date){W.date=days.filter(function(d){var c=load(d);return daySlots(d).some(function(t){return slotFree(d,t,flowMins(),c)})})[0]||days[0]}
    var c=load(W.date);
    b='<div class="days">'+days.map(function(d){var x=D(d);return '<button class="day" data-act="day" data-v="'+d+'" aria-pressed="'+(W.date===d)+'"><span>'+(d===TODAY?'idag':WD[x.getDay()])+'</span><b>'+x.getDate()+'</b><span>'+MON[x.getMonth()]+'</span></button>'}).join('')+'</div>'+
      '<div class="slots">'+daySlots(W.date).map(function(t){var ok=slotFree(W.date,t,flowMins(),c);return '<button class="slot" data-act="slot" data-v="'+t+'" '+(ok?'':'disabled aria-label="'+t+' är upptagen"')+' aria-pressed="'+(W.time===t)+'">'+t+'</button>'}).join('')+'</div>'+
      (W.time?'<div class="picked">'+ic('check')+'Vald tid: '+nice(W.date)+' klockan '+W.time+'</div>':'')+
      '<p class="small" style="margin-top:12px;color:var(--smoke)">Överstrukna tider är upptagna. Jobbet tar cirka '+flowMins()+' minuter.</p>';
  }
  if(st==='details'){title='Dina uppgifter';next=W.kind==='order'?'Lägg beställningen':'Boka tiden';
    var sum='<div class="sum">';
    if(W.kind!=='order'){sum+='<div><span>'+svc(W.svc).name+'</span><span>'+pTxt(svc(W.svc))+'</span></div>'+W.extras.map(function(x){return '<div><span>'+x.n+'</span><span>'+kr(x.p)+'</span></div>'}).join('')+'<div><span>Bil</span><span>'+esc(W.reg.toUpperCase())+'</span></div>';
      if(W.extras.length)sum+='<div class="tot"><span>Summa</span><span>'+kr(svc(W.svc).price+W.extras.reduce(function(a,x){return a+x.p},0))+'</span></div>'}
    else sum+='<div><span>'+S.cart.reduce(function(a,i){return a+i.qty},0)+' däck'+(W.fit?' med montering':'')+'</span><span>'+kr(cartTotal()+(W.fit?FIT:0))+'</span></div>';
    if(W.date&&W.time&&(W.kind==='booking'||W.fit))sum+='<div><span>Tid</span><span>'+nice(W.date)+' kl. '+W.time+'</span></div>';
    sum+='</div>';
    b=sum+'<label class="field"><span>Namn</span><input id="fName" value="'+esc(W.name)+'" autocomplete="name"></label>'+
      '<label class="field"><span>Mobilnummer</span><input id="fPhone" value="'+esc(W.phone)+'" inputmode="tel" autocomplete="tel"></label>'+
      (W.kind==='order'&&W.fit?'<label class="field"><span>Regnummer</span><input id="fReg" value="'+esc(W.reg)+'" maxlength="7" style="text-transform:uppercase"></label>':'')+
      '<label class="field"><span>Meddelande till verkstaden (frivilligt)</span><textarea id="fNote" rows="2">'+esc(W.note)+'</textarea></label>'+
      '<p class="small" style="color:var(--smoke)">Du betalar på plats. I den skarpa versionen går det också med Swish eller Klarna.</p>';
  }
  if(st==='done'){title=W.kind==='order'?'Beställt':'Bokat';var r=W.result;
    b='<div class="done"><h3 class="d">Tack '+esc(W.name.split(' ')[0])+'!</h3><div class="ref d">'+r.ref+'</div>'+
      '<p>'+(r.when?'Välkommen '+nice(r.date)+' klockan '+r.time+' till Brynäsgatan 67.':'Vi hör av oss när däcken är klara att hämta.')+'</p>'+
      '<p class="small" style="margin-top:14px;color:var(--smoke)">I den skarpa versionen får kunden ett sms nu och en påminnelse dagen innan. Öppna Verkstaden för att se hur ärendet landar hos er.</p></div>';
    next=null;
  }
  var sh=$('#sheet');
  if(!sh.firstChild)sh.innerHTML='<header>'+hubSvg(0,false)+'<h3 class="d" id="sheetTitle" tabindex="-1"></h3><button class="x" data-act="close" aria-label="Stäng">'+ic('x')+'</button></header><div class="sbody"></div><div class="sfoot"></div>';
  var body=$('.sbody',sh),same=W.shown===W.i,dl=$('.days',body),keep=same?[body.scrollTop,dl?dl.scrollLeft:0]:null,dir=W.i>=W.shown?' fwd':' back',first=W.shown<0;
  $('#sheetTitle').textContent=title;
  body.className='sbody'+(same||first?'':dir);
  body.innerHTML=(W.err?'<p class="err" role="alert">'+W.err+'</p>':'')+b;
  if(keep){body.scrollTop=keep[0];var d2=$('.days',body);if(d2)d2.scrollLeft=keep[1]}else{body.scrollTop=0;var sel=$('.day[aria-pressed=true]',body);if(sel&&sel.scrollIntoView)sel.scrollIntoView({block:'nearest',inline:'center'})}
  $('.sfoot',sh).innerHTML=(canBack?'<button class="btn line on-light" data-act="back"><span>Tillbaka</span></button>':'')+
    (st==='done'?'<button class="btn" data-act="toadmin"><span>Öppna Verkstaden</span></button>':(next?'<button class="btn" data-act="next"><span>'+next+'</span></button>':'<button class="btn ink" data-act="close"><span>Stäng</span></button>'));
  // nuts tighten one at a time: flip the classes after the paint so the transition runs
  requestAnimationFrame(function(){if(!sh.firstChild)return;[].forEach.call(sh.querySelectorAll('.nut'),function(n,k){n.style.transitionDelay=(k*70)+'ms';n.classList.toggle('on',k<nuts)});$('.hub',sh).classList.toggle('done',st==='done')});
  var pk=$('.picked',body);if(pk&&pk.scrollIntoView)pk.scrollIntoView({block:'nearest'});
  if(!same){W.shown=W.i;if(W.err){}else try{$('#sheetTitle').focus({preventScroll:true})}catch(e){}}
}
function grab(){['Reg','Model','Name','Phone','Note'].forEach(function(k){var e=$('#f'+k);if(e)W[k.toLowerCase()]=e.value.trim()});var f=$('#fFit');if(f)W.fit=f.checked}
function nextStep(){
  grab();W.err='';var st=W.steps[W.i];
  if(st==='service'&&!W.svc)W.err='Välj vad du vill ha hjälp med.';
  if((st==='car'||st==='quick')&&W.reg.replace(/\s/g,'').length<5)W.err='Skriv bilens regnummer, till exempel ABC 123.';
  else if(st==='quick'&&!W.svc)W.err='Välj vad det gäller.';
  if(st==='time'&&!W.time)W.err='Välj en ledig tid.';
  if(st==='details'){
    if(W.name.length<2)W.err='Skriv ditt namn så vi vet vem som kommer.';
    else if(W.phone.replace(/\D/g,'').length<7)W.err='Skriv ett mobilnummer så vi kan nå dig.';
    else if(W.kind==='order'&&W.fit&&W.reg.replace(/\s/g,'').length<5)W.err='Skriv regnumret på bilen som ska få däcken.';
  }
  if(W.err){renderSheet();return}
  if(st==='cart'&&!W.fit){W.i=2;renderSheet();return}
  if(st==='details'){commit();W.i=W.steps.length-1;renderSheet();if(wheel)wheel.kick(10);return}
  W.i++;renderSheet();
}
function commit(){
  var reg=W.reg.toUpperCase().replace(/\s+/g,'').replace(/^(.{3})/,'$1 ');
  var c=S.customers.filter(function(x){return x.phone.replace(/\D/g,'')===W.phone.replace(/\D/g,'')})[0];
  if(!c){c={id:'c'+(S.customers.length+1),name:W.name,phone:W.phone,since:now.getFullYear(),cars:[],hotel:null,isNew:true};S.customers.unshift(c)}
  if(reg.length>4&&!c.cars.some(function(x){return x.reg===reg}))c.cars.push({reg:reg,model:W.model||'Modell hämtas från regnumret'});
  var res={};
  if(W.kind==='order'){
    var o={id:'W-'+(S.oseq++),custId:c.id,date:TODAY,items:S.cart.slice(),fit:W.fit,total:cartTotal()+(W.fit?FIT:0),status:W.fit?'Väntar på montering':'Plockas',isNew:true};
    S.orders.unshift(o);
    S.cart.forEach(function(it){var k=it.pid+'|'+it.dim;S.stock[k]=Math.max(0,stockOf(k)-it.qty)});
    S.cart=[];res.ref=o.id;
  }
  if(W.kind!=='order'||W.fit){
    var sid=W.kind==='order'?'montering':W.svc;
    var bk={id:'NK-'+(S.seq++),custId:c.id,reg:reg,model:W.model,svc:sid,mins:svc(sid).mins,date:W.date,time:W.time,status:S.auto?'Bekräftad':'Ny',note:(W.cfg?'Valt i 3D: '+W.cfg.rim+' fälg, '+W.cfg.tyre.toLowerCase()+'. ':'')+(W.extras&&W.extras.length?'Tillval: '+W.extras.map(function(x){return x.n}).join(', ')+'. ':'')+W.note,src:W.kind==='order'?'Webshop':'Webben',isNew:true};
    S.bookings.push(bk);res.ref=res.ref||bk.id;res.when=true;res.date=W.date;res.time=W.time;
  }
  W.result=res;save();renderTyres();
}

/* ---------- workshop ---------- */
var A={tab:'idag',q:'',cust:null};
var TABS=[['idag','Idag'],['bokningar','Bokningar'],['kunder','Kunder'],['hotell','Däckhotell'],['ordrar','Ordrar'],['lager','Lager']];
var NEXT={'Ny':'Bekräfta','Bekräftad':'Starta jobbet','Pågår':'Markera som klar'};
var NEXTS={'Ny':'Bekräftad','Bekräftad':'Pågår','Pågår':'Klar'};
function bRow(b,showDate){
  var c=cust(b.custId)||{name:'Okänd'};
  return '<div class="row'+(b.status==='Ny'?' new':'')+'"><div class="t">'+b.time+(showDate?'<small>'+nice(b.date)+'</small>':'<small>'+b.mins+' min</small>')+'</div>'+
    '<div><div><button class="linkb" data-act="cust" data-id="'+b.custId+'">'+esc(c.name)+'</button> <span class="regp">'+esc(b.reg)+'</span></div><div class="what">'+svc(b.svc).name+', bokad via '+b.src.toLowerCase()+(b.note?'. ”'+esc(b.note)+'”':'')+'</div></div>'+
    '<span class="pill '+b.status+'">'+b.status+'</span>'+
    (NEXT[b.status]?'<div class="ract"><button class="btn sm ink" data-act="adv" data-id="'+b.id+'"><span>'+NEXT[b.status]+'</span></button></div>':'')+'</div>';
}
function custRows(list){
  return list.length?list.map(function(c){return '<div class="lrow"><div><button class="linkb" data-act="cust" data-id="'+c.id+'">'+esc(c.name)+'</button>'+(c.isNew?' <span class="pill Ny">Ny</span>':'')+'<div class="sub">'+esc(c.phone)+' '+c.cars.map(function(x){return '<span class="regp">'+esc(x.reg)+'</span>'}).join(' ')+'</div></div><div class="r sub">'+(c.hotel?'Hylla '+c.hotel.pos:'')+'</div></div>'}).join(''):'<p style="padding:16px;color:var(--smoke)">Ingen kund matchar. Prova med färre tecken.</p>';
}
var byTime=function(a,b){return (a.date+a.time).localeCompare(b.date+b.time)};
function renderAdmin(){
  var ac=$('#autoC');if(ac)ac.checked=!!S.auto;
  var nNew=S.bookings.filter(function(b){return b.status==='Ny'}).length;
  $('#tabs').innerHTML=TABS.map(function(t){return '<button role="tab" data-act="tab" data-v="'+t[0]+'" aria-selected="'+(A.tab===t[0])+'">'+t[1]+(t[0]==='bokningar'&&nNew?'<b>'+nNew+'</b>':'')+'</button>'}).join('');
  var h='',days=workdays(5),day0=days[0];
  if(A.cust){
    var c=cust(A.cust),bs=S.bookings.filter(function(b){return b.custId===c.id}).sort(byTime),os=S.orders.filter(function(o){return o.custId===c.id});
    h='<button class="linkb" data-act="custback">Tillbaka till kunder</button><h2 class="d" style="margin-top:14px">'+esc(c.name)+'</h2>'+
      '<div class="cols2" style="margin-top:18px"><div class="panel"><h3>Bokningar</h3>'+(bs.length?bs.map(function(b){return bRow(b,true)}).join(''):'<p style="padding:16px;color:var(--smoke)">Inga bokningar än.</p>')+'</div>'+
      '<div class="panel"><h3>Kunduppgifter</h3><dl class="kv"><dt>Mobil</dt><dd>'+esc(c.phone)+'</dd><dt>Kund sedan</dt><dd>'+c.since+'</dd>'+
      c.cars.map(function(x){return '<dt>Bil</dt><dd><span class="regp">'+esc(x.reg)+'</span> '+esc(x.model)+'</dd>'}).join('')+
      '<dt>Däckhotell</dt><dd>'+(c.hotel?'Hylla '+c.hotel.pos+', '+c.hotel.tyres.toLowerCase()+', '+c.hotel.depth.replace('.',',')+' mm':'Nej')+'</dd>'+
      '<dt>Ordrar</dt><dd>'+(os.length?os.map(function(o){return o.id+', '+kr(o.total)}).join('<br>'):'Inga')+'</dd></dl></div></div>';
  }
  else if(A.tab==='idag'){
    var td=S.bookings.filter(function(b){return b.date===day0}).sort(byTime);
    var newB=S.bookings.filter(function(b){return b.status==='Ny'}).sort(byTime);
    var fitO=S.orders.filter(function(o){return o.status==='Väntar på montering'}).length;
    var low=Object.keys(S.stock).filter(function(k){return S.stock[k]<4}).length;
    var hotelLow=S.customers.filter(function(c){return c.hotel&&+c.hotel.depth<4}).length;
    var open=420,close=closeHour(day0)*60,cap=2*(close-open),booked=td.reduce(function(a,b){return a+b.mins},0),occ=Math.round(booked/cap*100);
    var est=td.reduce(function(a,b){return a+(svc(b.svc).price||0)},0);
    var perH={};td.forEach(function(b){for(var m=toMin(b.time);m<toMin(b.time)+b.mins;m+=60){var h2=Math.floor(m/60);perH[h2]=(perH[h2]||0)+1}});
    var bh=Object.keys(perH).sort(function(a,b){return perH[b]-perH[a]})[0];
    var hr=new Date().getHours(),greet=hr<10?'God morgon':hr<17?'Hej':'God kväll',isT=day0===TODAY,dayW=isT?'Idag':'På '+WDL[D(day0).getDay()];
    var L=[];
    L.push(['',dayW+' har ni '+td.length+' '+(td.length===1?'bokning':'bokningar')+(td.length?', den första klockan '+td[0].time+'.':'.')]);
    L.push(newB.length?['hot',newB.length+' '+(newB.length===1?'webbokning väntar':'webbokningar väntar')+' på att ni bekräftar.']:['ok','Alla webbokningar är bekräftade.']);
    L.push(['','Lyftarna är bokade till '+occ+' procent'+(bh?', mest tryck runt klockan '+bh+'.':'.')]);
    if(fitO)L.push(['hot',fitO+' '+(fitO===1?'webborder ska':'webbordrar ska')+' monteras.']);
    if(low)L.push(['',low+' däck i lagret har färre än fyra kvar.']);
    if(hotelLow)L.push(['',hotelLow+' kunder i däckhotellet har under 4 mm mönster. Bra läge att erbjuda nya däck.']);
    // lift lanes: give each booking the first lift that is free
    var lanes=[[],[]],ends=[0,0];td.forEach(function(b){var s0=toMin(b.time),li=ends[0]<=s0?0:ends[1]<=s0?1:(ends[0]<=ends[1]?0:1);lanes[li].push(b);ends[li]=s0+b.mins});
    var span=close-open,hrs=(close-open)/60,pct=function(m){return ((m-open)/span*100).toFixed(2)+'%'},nm=new Date().getHours()*60+new Date().getMinutes();
    var tl='<div class="tlg"><div class="tlh" style="grid-template-columns:repeat('+hrs+',1fr)">'+Array.apply(null,{length:hrs}).map(function(_,k){return '<span>'+pad(7+k)+'</span>'}).join('')+'</div>'+
      lanes.map(function(ln,k){return '<div class="lane"><span>Lyft '+(k+1)+'</span><div class="track" style="--h:'+hrs+'">'+ln.map(function(b,n){var c=cust(b.custId)||{name:''};return '<button class="blk '+b.status+'" data-act="cust" data-id="'+b.custId+'" style="left:'+pct(toMin(b.time))+';width:calc('+(b.mins/span*100).toFixed(2)+'% - 4px);animation-delay:'+(n*50)+'ms" title="'+esc(c.name)+'"><b>'+b.time+' '+esc(b.reg)+'</b><span>'+svc(b.svc).name+'</span></button>'}).join('')+'</div></div>'}).join('')+
      (isT&&nm>open&&nm<close?'<i class="nowl" style="left:calc(62px + (100% - 62px) * '+((nm-open)/span).toFixed(4)+')"></i>':'')+'</div>';
    var days=workdays(5),max=Math.max.apply(null,days.map(function(d){return S.bookings.filter(function(b){return b.date===d}).length}))||1;
    h='<section class="brief"><p class="when">'+WDL[now.getDay()].replace(/^./,function(c){return c.toUpperCase()})+' '+now.getDate()+' '+MON[now.getMonth()]+'</p><h2 class="d">'+greet+', Nicklas</h2><ul>'+L.map(function(l){return '<li class="'+l[0]+'">'+l[1]+'</li>'}).join('')+'</ul><p class="note">Sammanfattningen räknas fram ur bokningarna, ordrarna och lagret just nu.</p></section>'+
      '<div class="kpis"><div class="kpi"><b>'+td.length+'</b><span>bokningar '+(isT?'idag':'den dagen')+'</span></div><div class="kpi'+(newB.length?' hot':'')+'"><b>'+newB.length+'</b><span>att bekräfta</span></div>'+
      '<div class="kpi"><b>'+occ+' %</b><span>beläggning på lyftarna</span></div><div class="kpi"><b>'+kr(est)+'</b><span>beräknat, exempelpriser</span></div></div>'+
      '<div class="panel tl"><h3>Lyftarna '+(isT?'idag':nice(day0))+'</h3><div class="tlw">'+(td.length?tl:'<p style="color:var(--smoke)">Inga bokningar. Nya hamnar här så fort en kund bokar.</p>')+'</div></div>'+
      '<div class="cols2"><div class="panel"><h3>Att bekräfta</h3>'+(newB.length?newB.map(function(b){return bRow(b,true)}).join(''):'<p style="padding:16px;color:var(--smoke)">Inget att bekräfta just nu.</p>')+'</div>'+
      '<div class="panel"><h3>Kommande dagar</h3><div class="bars">'+days.map(function(d,i){var n=S.bookings.filter(function(b){return b.date===d}).length;return '<div><b>'+n+'</b><i style="height:'+Math.round(n/max*100)+'%;animation-delay:'+(i*60)+'ms"></i>'+WD[D(d).getDay()]+'</div>'}).join('')+'</div></div></div>';
  }
  else if(A.tab==='bokningar'){
    var all=S.bookings.filter(function(b){return b.date>=TODAY}).sort(function(a,b){return (b.status==='Ny')-(a.status==='Ny')||byTime(a,b)});
    h='<h2 class="d">Bokningar</h2><p style="color:var(--smoke);margin-top:6px">Nya bokningar från webben hamnar överst tills ni bekräftat dem.</p><div class="panel" style="margin-top:18px">'+all.map(function(b){return bRow(b,true)}).join('')+'</div>';
  }
  else if(A.tab==='kunder'){
    var q=A.q.toLowerCase().replace(/\s/g,''),list=S.customers.filter(function(c){return !q||(c.name+c.phone+c.cars.map(function(x){return x.reg}).join('')).toLowerCase().replace(/\s/g,'').indexOf(q)>-1});
    h='<h2 class="d">Kunder</h2><input class="search" id="q" placeholder="Sök på namn, mobil eller regnummer" aria-label="Sök kund" value="'+esc(A.q)+'">'+
      '<div class="panel" id="custList">'+custRows(list)+'</div>';
  }
  else if(A.tab==='hotell'){
    var hs=S.customers.filter(function(c){return c.hotel});
    h='<h2 class="d">Däckhotell</h2><p style="color:var(--smoke);margin-top:6px">'+hs.length+' uppsättningar i förvaring. Hjul under 4 mm flaggas inför nästa säsong.</p><div class="panel" style="margin-top:18px">'+
      hs.map(function(c){var low=+c.hotel.depth<4;return '<div class="lrow"><div><b>Hylla '+c.hotel.pos+'</b> <button class="linkb" data-act="cust" data-id="'+c.id+'">'+esc(c.name)+'</button><div class="sub"><span class="regp">'+esc(c.cars[0].reg)+'</span> '+c.hotel.tyres+'</div></div><div class="r">'+c.hotel.depth.replace('.',',')+' mm'+(low?'<br><span class="pill Ny">Byt snart</span>':'')+'</div></div>'}).join('')+'</div>';
  }
  else if(A.tab==='ordrar'){
    h='<h2 class="d">Webbordrar</h2><div class="panel" style="margin-top:18px">'+
      S.orders.map(function(o){var c=cust(o.custId)||{name:''};return '<div class="lrow'+(o.isNew&&o.status!=='Utlämnad'?' new':'')+'"><div><b>'+o.id+'</b> '+esc(c.name)+'<div class="sub">'+o.items.map(function(i){var p=prod(i.pid);return i.qty+' st '+p.brand+' '+p.model+', '+i.dim}).join('<br>')+(o.fit?'<br>Med montering':'')+'<br><span class="pill'+(o.status==='Utlämnad'?' Klar':'')+'" style="margin-top:6px">'+o.status+'</span></div></div><div class="r">'+kr(o.total)+'</div>'+(o.status!=='Utlämnad'?'<div class="full"><button class="btn sm ink" data-act="odone" data-id="'+o.id+'"><span>Lämna ut</span></button></div>':'')+'</div>'}).join('')+'</div>';
  }
  else if(A.tab==='lager'){
    var keys=Object.keys(S.stock).sort();
    h='<h2 class="d">Lager</h2><p style="color:var(--smoke);margin-top:6px">Saldot räknas ner automatiskt när någon handlar på webben.</p><div class="panel" style="margin-top:18px">'+
      keys.map(function(k){var p=prod(k.split('|')[0]),d=k.split('|')[1],n=S.stock[k];return '<div class="lrow"><div><b>'+p.brand+'</b> '+p.model+'<div class="sub">'+d+', '+kr(price(p,d))+'</div></div><div class="r"><span class="qty"><button data-act="stock" data-k="'+k+'" data-d="-1" aria-label="Minska saldo">−</button><span style="min-width:26px;text-align:center;'+(n<5?'color:var(--red-deep)':'')+'">'+n+'</span><button data-act="stock" data-k="'+k+'" data-d="1" aria-label="Öka saldo">+</button></span></div></div>'}).join('')+'</div>';
  }
  $('#amain').innerHTML=h;
}

/* ---------- wiring ---------- */
function setView(v){vt(function(){setViewNow(v)})}
function setViewNow(v){
  $('#site').hidden=v!=='site';$('#admin').hidden=v!=='admin';
  document.body.classList.toggle('adm',v==='admin');
  [].forEach.call(document.querySelectorAll('[data-view]'),function(b){b.setAttribute('aria-pressed',b.dataset.view===v)});
  if(v==='admin'){PRODUCTS.forEach(function(p){stockOf(p.id+'|205/55 R16');stockOf(p.id+'|'+dimStr())});renderAdmin()}
  window.scrollTo(0,0);if(v==='site'&&wheel){measure();storyUI()}
}
/* ---------- car configurator ---------- */
var car=null,CF={cat:'dack',rim:'sport',paint:'obsidian',leds:true,glow:true,view:'front',hwy:false,tip:null};
var RIMN={sport:'Sport',classic:'Classic',black:'Black Edition'},PAINTN={obsidian:'Obsidian Black',silver:'Nordic Silver',white:'Ice White',midnight:'Midnight Blue'},PAINTC={obsidian:'#0b0b0d',silver:'#9ea4ab',white:'#e6eaee',midnight:'#0d1a3c'};
var SEAN={sommar:'Sommardäck',friktion:'Friktionsdäck',dubb:'Dubbdäck'},VIEWN={front:'3/4 fram',side:'Sidoprofil',close:'Närbild fälg'};
var CATS=[['dack','Däck'],['falg','Fälg'],['lack','Lack'],['ljus','Ljus'],['vy','Vy']];
function renderCfg(flash){
  $('#ccats').innerHTML=CATS.map(function(c){return '<button role="tab" data-act="ccat" data-v="'+c[0]+'" aria-selected="'+(CF.cat===c[0])+'">'+c[1]+'</button>'}).join('');
  var o=[],P=function(k,v,l,sel,sw){o.push('<button data-act="copt" data-k="'+k+'" data-v="'+v+'" aria-pressed="'+sel+'">'+(sw?'<i style="--c:'+sw+'"></i>':'')+l+'</button>')};
  if(CF.cat==='dack')TYPES.forEach(function(t){P('season',t[0],SEAN[t[0]],SEASON===t[0])});
  if(CF.cat==='falg')['sport','classic','black'].forEach(function(r){P('rim',r,RIMN[r],CF.rim===r)});
  if(CF.cat==='lack')['obsidian','silver','white','midnight'].forEach(function(p){P('paint',p,PAINTN[p],CF.paint===p,PAINTC[p])});
  if(CF.cat==='ljus'){P('leds',CF.leds?'0':'1','LED-ljus '+(CF.leds?'på':'av'),CF.leds);P('glow',CF.glow?'0':'1','Underglow '+(CF.glow?'på':'av'),CF.glow)}
  if(CF.cat==='vy')['front','side','close'].forEach(function(v){P('view',v,VIEWN[v],CF.view===v)});
  $('#copts').innerHTML=o.join('');
  $('#csel').innerHTML='Valt<b'+(flash?' class="flash"':'')+'>'+RIMN[CF.rim]+', '+SEAN[SEASON]+'</b>';
}
window.renderCfg=renderCfg;
function cfgPick(k,v){
  var keepCat=true;
  if(k==='season'){setSeason(v);return}
  if(k==='rim'){CF.rim=v;if(car)car.setRim(v)}
  if(k==='paint'){CF.paint=v;if(car)car.setPaint(v)}
  if(k==='leds'){CF.leds=v==='1';if(car)car.setLights(CF.leds)}
  if(k==='glow'){CF.glow=v==='1';if(car)car.setGlow(CF.glow)}
  if(k==='view'){CF.view=v;closeTip();if(car)car.view(v)}
  if(keepCat){var sc=$('#copts').scrollLeft;renderCfg(k==='rim');$('#copts').scrollLeft=sc}
}
var TIPS={wheel:['Hjul och balansering','Vi monterar, balanserar och gör hjulinställning här på Brynäs. Däckhotell finns från 895 kr per säsong (exempelpris).','montering','Boka montering'],
  brake:['Bromsar','Vi byter skivor och belägg och säger vad det kostar innan vi börjar.','verkstad','Boka verkstadstid']};
function openTip(v,el){
  if(CF.tip===v){closeTip();return}
  CF.tip=v;var t=TIPS[v];$('#ctip').innerHTML='<b>'+t[0]+'</b><p>'+t[1]+'</p><button class="btn sm" data-act="book" data-svc="'+t[2]+'"><span>'+t[3]+'</span></button>';
  $('#ctip').classList.add('on');[].forEach.call(document.querySelectorAll('.cpin'),function(p){p.setAttribute('aria-expanded',p.dataset.v===v)});
}
function closeTip(){CF.tip=null;var t=$('#ctip');if(t)t.classList.remove('on');[].forEach.call(document.querySelectorAll('.cpin'),function(p){p.setAttribute('aria-expanded','false')})}
(function(){
  var sec=$('#bygg'),stage=$('#cstage'),pins=[].slice.call(document.querySelectorAll('.cpin')),tip=$('#ctip'),km=$('#kmh'),lastKm=-1,started=false;
  function prog(){var r=sec.getBoundingClientRect(),vh=window.innerHeight,dm=document.querySelector('.demo').offsetHeight;
    return {q:clamp(1-(r.top-dm)/(vh-dm)),p:clamp(-(r.top-dm)/Math.max(1,r.height-(vh-dm))),r:r}}
  function extra(){var g=prog();return {az:(1-smooth(g.q))*1.1+g.p*.9,dim:smooth((g.p-.82)/.18)}}
  function onFrame(){
    var k=Math.round(car.kmh());if(k!==lastKm){km.textContent=k;lastKm=k}
    var sr=stage.getBoundingClientRect();
    pins.forEach(function(p){var pt=car.project(p.dataset.v),show=pt&&pt.ok&&!CF.hwy&&CF.view!=='side'&&pt.y<$('.cdock',stage).offsetTop-8&&pt.y>$('.ctop',stage).offsetHeight+8;
      p.classList.toggle('on',!!show);if(pt)p.style.transform='translate3d('+pt.x.toFixed(1)+'px,'+pt.y.toFixed(1)+'px,0)';
      if(CF.tip===p.dataset.v){if(!show&&!CF.hwy){}else if(!show){closeTip()}else{var tw=tip.offsetWidth,th=tip.offsetHeight,x=Math.max(12,Math.min(sr.width-tw-12,pt.x-tw*.5)),y=pt.y-th-26;if(y<64)y=pt.y+30;tip.style.transform='translate3d('+x.toFixed(0)+'px,'+y.toFixed(0)+'px,0)'}}});
  }
  function start(){
    if(started)return;started=true;
    try{car=window.NKCar&&window.NKCar.mount($('#car'),{season:SEASON,extra:extra,onFrame:onFrame})}catch(e){car=null}
    if(!car){sec.style.display='none';return}
    var pad=function(){var sr=stage.getBoundingClientRect(),t=$('.ctop',stage).getBoundingClientRect(),d=$('.cdock',stage).getBoundingClientRect();car.setPad(Math.max(0,t.bottom-sr.top),Math.max(0,sr.bottom-d.top))};
    pad();window.addEventListener('resize',pad);if(document.fonts)document.fonts.ready.then(pad);
  }
  onScrollFns.push(function(){var g=prog();stage.style.setProperty('--dk',smooth((g.p-.86)/.14).toFixed(3));
    document.documentElement.classList.toggle('incfg',g.q>.6&&g.p<.97&&!$('#site').hidden)});
  if('IntersectionObserver' in window)new IntersectionObserver(function(e){if(e[0].isIntersecting)start()},{rootMargin:'700px 0px'}).observe(sec);else start();
  renderCfg();
})();
$('#quote').addEventListener('submit',function(e){e.preventDefault();var r=$('#qReg').value.trim();openFlow('quick',{svc:QV,reg:r})});

var tT;function toast(m){var t=$('#toast');t.textContent=m;t.classList.remove('on');void t.offsetWidth;t.classList.add('on');clearTimeout(tT);tT=setTimeout(function(){t.classList.remove('on')},2600)}
function cyc(arr,v,d){var i=arr.indexOf(v)+d;return arr[(i+arr.length)%arr.length]}
document.addEventListener('click',function(e){
  var v=e.target.closest('[data-view]');if(v){setView(v.dataset.view);return}
  if(e.target.id==='scrim'){closeFlow();return}
  var el=e.target.closest('[data-act]');if(!el)return;var a=el.dataset.act,d=el.dataset;
  if(a==='book'){closeCard();openFlow('booking',{svc:d.svc})}
  else if(a==='season')setSeason(d.v);
  else if(a==='qpick'){QV=d.v;renderCards()}
  else if(a==='cfgbook'){closeTip();openFlow('quick',{svc:'nyadack',cfg:{rim:RIMN[CF.rim],tyre:SEAN[SEASON]}})}
  else if(a==='ccat'){CF.cat=d.v;renderCfg()}
  else if(a==='copt')cfgPick(d.k,d.v);
  else if(a==='hwy'){CF.hwy=!CF.hwy;el.setAttribute('aria-pressed',CF.hwy);closeTip();if(car)car.setHighway(CF.hwy)}
  else if(a==='cpin')openTip(d.v,el);
  else if(a==='hot')openHot(d.v);
  else if(a==='cardx')closeCard();
  else if(a==='scanbook'){closeCard();openFlow('booking',{svc:'skifte',reg:REG})}
  else if(a==='bookhotel'){var xs=[].slice.call(document.querySelectorAll('#hotelOpts input[data-x]:checked')).map(function(i){return {n:i.dataset.n,p:+i.dataset.p}});openFlow('booking',{svc:'hotell',extras:xs})}
  else if(a==='cart')openFlow('order');
  else if(a==='finish'){[].forEach.call(document.querySelectorAll('.sw'),function(b){b.setAttribute('aria-pressed',b.dataset.v===d.v)});if(wheel)wheel.setFinish(d.v)}
  else if(a==='svc'){openSvc=openSvc===d.v?null:d.v;[].forEach.call(document.querySelectorAll('.svc-row'),function(r){var on=r.querySelector('.svc-head').dataset.v===openSvc;r.classList.toggle('open',on);r.querySelector('.svc-head').setAttribute('aria-expanded',on);var bb=r.querySelector('.btn');if(on)bb.removeAttribute('tabindex');else bb.setAttribute('tabindex','-1')})}
  else if(a==='step'){var arr={w:WS,p:PS,r:RS}[d.k];F[d.k]=cyc(arr,F[d.k],+d.d);renderSize(+d.d,d.k);renderTyres();var nb=document.querySelector('[data-act=step][data-k='+d.k+'][data-d="'+d.d+'"]');if(nb)nb.focus({preventScroll:true})}
  else if(a==='add'){var dim=dimStr(),it=S.cart.filter(function(i){return i.pid===d.pid&&i.dim===dim})[0];if(it)it.qty+=4;else S.cart.push({pid:d.pid,dim:dim,qty:4});save();
    setCart();var cb=$('#cartn');cb.classList.remove('pop');void cb.offsetWidth;cb.classList.add('pop');
    el.classList.add('added');el.innerHTML='<span>'+ic('check')+'Ligger i varukorgen</span>';setTimeout(function(){if(el.isConnected){el.classList.remove('added');el.innerHTML='<span>Lägg 4 till</span>'}},1800)}
  else if(a==='close')closeFlow();
  else if(a==='back'){grab();W.err='';W.i=(W.steps[W.i]==='details'&&W.kind==='order'&&!W.fit)?0:W.i-1;renderSheet()}
  else if(a==='next')nextStep();
  else if(a==='pick'){W.svc=d.v;W.time=null;renderSheet()}
  else if(a==='day'){W.date=d.v;W.time=null;renderSheet()}
  else if(a==='slot'){W.time=d.v;W.err='';renderSheet()}
  else if(a==='qty'){grab();var c=S.cart[+d.k];c.qty+=+d.d;if(c.qty<1)S.cart.splice(+d.k,1);save();renderTyres();renderSheet()}
  else if(a==='toadmin'){var ord=W.kind==='order'&&!W.fit;closeFlow();A.cust=null;A.tab=ord?'ordrar':'bokningar';setView('admin')}
  else if(a==='tab'){A.tab=d.v;A.cust=null;vt(renderAdmin)}
  else if(a==='adv'){var b=S.bookings.filter(function(x){return x.id===d.id})[0];b.status=NEXTS[b.status];save();renderAdmin();toast(b.id+' är nu '+b.status.toLowerCase())}
  else if(a==='cust'){A.cust=d.id;vt(function(){renderAdmin();window.scrollTo(0,0)})}
  else if(a==='custback'){A.cust=null;A.tab='kunder';vt(renderAdmin)}
  else if(a==='odone'){var o=S.orders.filter(function(x){return x.id===d.id})[0];o.status='Utlämnad';save();renderAdmin();toast(o.id+' är utlämnad')}
  else if(a==='stock'){S.stock[d.k]=Math.max(0,S.stock[d.k]+ +d.d);save();renderAdmin()}
  else if(a==='reset'){try{localStorage.removeItem(KEY)}catch(x){}seed();A={tab:'idag',q:'',cust:null};setView('admin');renderTyres();toast('Demon är återställd')}
});
var txT;
document.addEventListener('input',function(e){
  if(e.target.id==='tyreText'){clearTimeout(txT);var val=e.target.value.trim().toUpperCase();txT=setTimeout(function(){if(wheel){wheel.setText(val||'NK BIL & DÄCK');wheel.kick(3)}},140)}
  if(e.target.id==='q'){A.q=e.target.value;var qq=A.q.toLowerCase().replace(/\s/g,'');$('#custList').innerHTML=custRows(S.customers.filter(function(c){return !qq||(c.name+c.phone+c.cars.map(function(x){return x.reg}).join('')).toLowerCase().replace(/\s/g,'').indexOf(qq)>-1}))}
});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&W)closeFlow()});
if('IntersectionObserver' in window){new IntersectionObserver(function(en,ob){if(en[0].isIntersecting){$('#skid').classList.add('in');ob.disconnect()}},{threshold:.6}).observe($('#skid'))}else $('#skid').classList.add('in');

renderStatic();renderServices();renderCards();renderSize();renderSeason();renderTyres();
setTimeout(function(){document.documentElement.classList.add('ready')},2400);
var hpNow=895,hpRaf=0;
document.addEventListener('change',function(e){
  if(e.target.id==='autoC'){S.auto=e.target.checked;save();toast(S.auto?'Nya webbokningar bekräftas automatiskt':'Nya webbokningar väntar på er bekräftelse');return}
  if(!e.target.matches||!e.target.matches('#hotelOpts input'))return;
  var to=895+[].slice.call(document.querySelectorAll('#hotelOpts input[data-x]:checked')).reduce(function(a,i){return a+ +i.dataset.p},0),from=hpNow,t0=performance.now(),el=$('#hotelPrice');
  cancelAnimationFrame(hpRaf);(function run(n){var t=Math.min(1,(n-t0)/(RM?1:420)),k=1-Math.pow(1-t,3);hpNow=Math.round(from+(to-from)*k);el.textContent=kr(hpNow);if(t<1)hpRaf=requestAnimationFrame(run)})(t0);
});
var TC=null;
function untilt(c){if(!c)return;c.classList.remove('live');['--rx','--ry','--s'].forEach(function(p){c.style.removeProperty(p)});c.style.setProperty('--g','0')}
function tilt(c,e,amt){var r=c.getBoundingClientRect(),px=(e.clientX-r.left)/r.width,py=(e.clientY-r.top)/r.height;c.classList.add('live');
  c.style.setProperty('--ry',((px-.5)*amt).toFixed(2)+'deg');c.style.setProperty('--rx',((.5-py)*amt*.8).toFixed(2)+'deg');c.style.setProperty('--gx',(px*100).toFixed(1)+'%');c.style.setProperty('--gy',(py*100).toFixed(1)+'%');c.style.setProperty('--g','1')}
if(!RM){
  document.addEventListener('pointermove',function(e){if(e.pointerType!=='mouse')return;var c=e.target.closest?e.target.closest('.tcard'):null;if(TC&&TC!==c){untilt(TC);TC=null}if(c){TC=c;tilt(c,e,12)}},{passive:true});
  document.addEventListener('pointerdown',function(e){if(e.pointerType==='mouse')return;var c=e.target.closest?e.target.closest('.tcard'):null;if(c){TC=c;tilt(c,e,7);c.style.setProperty('--s','.985')}},{passive:true});
  ['pointerup','pointercancel'].forEach(function(n){document.addEventListener(n,function(e){if(e.pointerType!=='mouse'&&TC){untilt(TC);TC=null}},{passive:true})});
}
/* scroll bus: one rAF-throttled listener, plus a smoothed scroll velocity */
var sv=0,lastSY=window.scrollY,lastST=performance.now(),stick=false;
window.addEventListener('scroll',function(){
  var n=performance.now(),dy=window.scrollY-lastSY,dt=Math.max(8,n-lastST);lastSY=window.scrollY;lastST=n;sv+=((dy/dt*1000)-sv)*.35;
  if(stick)return;stick=true;requestAnimationFrame(function(){stick=false;onScrollFns.forEach(function(f){f()})});
},{passive:true});
/* address fills with paint as it scrolls into view */
(function(){var a=document.querySelector('.addr');if(!a)return;
  onScrollFns.push(function(){var r=a.getBoundingClientRect(),vh=window.innerHeight,p=clamp((vh*.92-r.top)/(vh*.42));a.style.setProperty('--fill',p.toFixed(3));a.classList.toggle('full',p>=1)});
})();
/* tape: speed and lean follow the scroll */
(function(){var el=$('#tapeIn');if(!el)return;
  var nut='<svg viewBox="0 0 16 16"><path d="M8 0l6.9 4v8L8 16 1.1 12V4z"/></svg>',one='<span>Däck'+nut+'Fälgar'+nut+'Verkstad'+nut+'Brynäs sedan 1993'+nut+'</span>';
  el.innerHTML=one+one+one+one+one+one;
  if(RM)return;
  var x=0,w=0,vis=false,prev=0,lean=0;
  new IntersectionObserver(function(e){vis=e[0].isIntersecting;if(vis){w=el.firstChild.offsetWidth;prev=performance.now();requestAnimationFrame(run)}},{rootMargin:'60px'}).observe(el.parentNode);
  function run(n){if(!vis)return;var dt=Math.min(.05,(n-prev)/1000);prev=n;sv*=Math.pow(.02,dt);
    x-=(46+sv*.22)*dt;if(w){x=((x%w)-w)%w}
    lean+=(Math.max(-10,Math.min(10,sv*.006))-lean)*Math.min(1,dt*8);
    el.style.transform='translate3d('+x.toFixed(1)+'px,0,0) skewX('+(-lean).toFixed(2)+'deg)';requestAnimationFrame(run)}
})();
/* burnout smoke */
var smokeOn=false,PT=[],acc=0,revving=false;
function smokeLoop(){
  if(smokeOn||RM||!wheel)return;smokeOn=true;
  var c=$('#smoke'),g=c.getContext('2d'),prev=performance.now(),col=getComputedStyle(document.documentElement).getPropertyValue('--smokec').trim()||'rgba(210,200,198,.5)';
  c.width=c.clientWidth;c.height=c.clientHeight;
  (function run(n){
    var dt=Math.min(.05,(n-prev)/1000);prev=n;var sp=Math.abs(wheel.speed()),P=wheel.where();
    if(sp>12&&window.scrollY<G.S0*.4){acc+=Math.min(90,(sp-12)*4)*dt;for(;acc>=1;acc--)if(PT.length<130)PT.push({x:P.x-P.d*.04+(Math.random()-.5)*P.d*.12,y:P.y+P.d*.47,vx:-(50+Math.random()*210),vy:-(8+Math.random()*52),r:P.d*.035+Math.random()*P.d*.04,a:.13+Math.random()*.12,l:0})}
    g.clearRect(0,0,c.width,c.height);
    for(var j=PT.length-1;j>=0;j--){var p=PT[j];p.l+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.985;p.vy*=.985;p.r+=dt*P.d*.1;var al=p.a*(1-p.l/1.9);
      if(al<=0){PT.splice(j,1);continue}
      var gr=g.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r);gr.addColorStop(0,col);gr.addColorStop(1,'rgba(210,200,198,0)');g.globalAlpha=al;g.fillStyle=gr;g.beginPath();g.arc(p.x,p.y,p.r,0,7);g.fill()}
    g.globalAlpha=1;
    if(PT.length||sp>12||revving)requestAnimationFrame(run);else{smokeOn=false;g.clearRect(0,0,c.width,c.height)}
  })(prev);
}
(function(){var els=[].slice.call(document.querySelectorAll('.sec h2:not(.addr)'));
  if(!('IntersectionObserver' in window)||RM)return;
  var io=new IntersectionObserver(function(en){en.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}})},{threshold:.25,rootMargin:'0px 0px -6% 0px'});
  els.forEach(function(e){e.innerHTML='<span class="rvi">'+e.innerHTML+'</span>';e.classList.add('rv');io.observe(e)});
})();
})();
