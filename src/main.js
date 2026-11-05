import { auth, firestore } from './firebase.js';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const KEY='my_salary_book_v1';
let db={salary:8000,salaryDay:5,months:{}};
const $=id=>document.getElementById(id);
const today=()=>new Date().toISOString().slice(0,10);
function blank(){return {advances:[],deductions:[],received:[]}}
function currentMonth(){return $('month').value}
function data(){
let m=currentMonth();
if(!db.months[m])db.months[m]={...blank(),salary:db.salary};
return db.months[m];
}
function save(){
    if(!currentUser) return;
    const value=JSON.stringify(db);
    localStorage.setItem(KEY+'_'+currentUser.uid,value);
    if(cloudReady){
      setDoc(doc(firestore,'users',currentUser.uid,'salaryBook','data'),
        {payload:db,updatedAt:new Date().toISOString()},{merge:true}
      ).catch(e=>console.error('Cloud save error:',e));
    }
  }
function money(n){return '₹'+Number(n||0).toLocaleString('en-IN')}
function sum(a){return a.reduce((s,x)=>s+Number(x.amount),0)}
function totals(){
let d=data(),a=sum(d.advances),r=sum(d.received);
return {a,r,left:Number(d.salary)-a-r};
}
function render(){
let d=data(),t=totals();
$('salary').textContent=money(d.salary);
$('advance').textContent=money(t.a);

$('remaining').textContent=money(t.left);
let rows=[];
['advances','received'].forEach(g=>d[g].forEach((x,i)=>rows.push({...x,group:g,index:i,type:g==='advances'?'एडवांस':'सैलरी प्राप्त'})));
rows.sort((a,b)=>b.date.localeCompare(a.date));
$('history').innerHTML=rows.length?rows.map(x=>`<div class="entry"><button onclick="removeEntry('${x.group}',${x.index})">हटाएँ</button><b>${x.type}: ${money(x.amount)}</b><br>${x.reason||'सैलरी प्राप्त'}<br><span class="muted">${x.date}</span></div>`).join(''):'<p class="muted">इस महीने कोई रिकॉर्ड नहीं है।</p>';
$('newSalary').value=d.salary;
$('salaryDay').value=db.salaryDay;
$('summaryText').innerHTML=`<p>महीने की सैलरी: <b>${money(d.salary)}</b></p><p>कुल एडवांस: <b>${money(t.a)}</b></p><p>प्राप्त सैलरी: <b>${money(t.r)}</b></p><div class="balance">बाकी हिसाब<h2>${money(t.left)}</h2></div>`;
}
function openScreen(id){
document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
$(id).classList.add('active');
if(id==='historyScreen'||id==='summaryScreen')render();
window.scrollTo(0,0);
}
function goHome(){openScreen('home')}
function addAdvance(){
let amount=Number($('amount').value),reason=$('reason').value.trim(),date=$('date').value;
if(amount<=0||!reason||!date)return alert('रकम, कारण और तारीख भरें।');
data().advances.push({amount,reason,date});save();
$('amount').value='';$('reason').value='';render();alert('एडवांस सेव हो गया!');goHome();
}
function receiveSalary(){
let amount=Number($('received').value),date=$('receivedDate').value;
if(amount<=0||!date)return alert('रकम और तारीख भरें।');
data().received.push({amount,date,reason:'सैलरी प्राप्त'});save();
$('received').value='';render();alert('सैलरी सेव हो गई!');goHome();
}

function removeEntry(group,i){
if(!confirm('क्या यह रिकॉर्ड हटाना चाहते हैं?'))return;
data()[group].splice(i,1);save();render();
}
function saveSalary(){
let n=Number($('newSalary').value);
if(n<0||$('newSalary').value==='')return alert('सही सैलरी भरें।');
db.salary=n;data().salary=n;save();render();alert('सैलरी बदल गई!');
}
function saveSalaryDay(){
let n=Number($('salaryDay').value);
if(n<1||n>31)return alert('1 से 31 के बीच तारीख भरें।');
db.salaryDay=n;save();alert('तारीख सेव हो गई!');
}

const languageMap = {
'💰 महीने की सैलरी':'💰 Monthly Salary',
'📤 कुल एडवांस':'📤 Total Advance',
'✅ बाकी सैलरी':'✅ Remaining Salary',
'आपके मुख्य विकल्प':'YOUR MAIN OPTIONS',
'नया एडवांस':'Add New Advance',
'एडवांस की जानकारी':'Advance Details',
'कितने रुपये लिए?':'Amount Taken',
'किस लिए लिए?':'Reason for Advance',
'किस तारीख को लिए?':'Date of Advance',
'एडवांस सेव करें':'Save Advance',
'सैलरी प्राप्त करें':'Salary Received',
'मिली हुई सैलरी दर्ज करें':'Enter salary received',
'सैलरी की जानकारी':'Salary Details',
'कितने रुपये मिले?':'Amount Received',
'किस तारीख को मिले?':'Date Received',
'सैलरी सेव करें':'Save Salary',
'हिसाब की हिस्ट्री':'Transaction History',
'सभी लेन-देन देखें':'View all transactions',
'महीने का हिसाब':'Monthly Summary',
'पूरी सैलरी का विवरण':'Full salary details',
'सैलरी और ऐप सेटिंग':'Salary and app settings',
'आपकी सेटिंग':'Your Settings',
'महीने की सैलरी बदलें':'Change Monthly Salary',
'अपनी नई सैलरी सेट करें':'Set your new salary',
'सैलरी मिलने की तारीख':'Salary Payment Date',
'हर महीने किस तारीख को मिलती है':'Your monthly salary date',
'तारीख (1 से 31)':'Date (1 to 31)',
'तारीख सेव करें':'Save Date',
'डेटा सुरक्षा':'Data Security',
'अभी डेटा इसी ब्राउज़र में सेव होता है':'Data is saved in this browser',
'हिसाब का महीना':'Select Month',
'कुल एडवांस':'Total Advance',
'प्राप्त सैलरी':'Salary Received',
'बाकी हिसाब':'Remaining Balance',
'इस महीने कोई रिकॉर्ड नहीं है।':'No records for this month.',
'एडवांस':'Advance',
'सैलरी प्राप्त':'Salary Received',
'हटाएँ':'Delete'
};

let currentLanguage = localStorage.getItem('salary_language') || 'hi';

function applyLanguage(){
  const reverse = Object.fromEntries(
    Object.entries(languageMap).map(([a,b])=>[b,a])
  );
  const walker = document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  let node;
  while(node = walker.nextNode()){
    const v = node.nodeValue.trim();
    if(!v) continue;
    const translated = currentLanguage === 'en' ? languageMap[v] : reverse[v];
    if(translated) node.nodeValue = node.nodeValue.replace(v,translated);
  }
  document.documentElement.lang = currentLanguage;
  const select = document.getElementById('languageSelect');
  if(select) select.value = currentLanguage;
}

function changeLanguage(lang){
  currentLanguage = lang;
  localStorage.setItem('salary_language',lang);
  applyLanguage();
}

$('month').value=today().slice(0,7);
$('date').value=today();
$('receivedDate').value=today();

$('month').addEventListener('change',render);
render();
applyLanguage();


let currentUser=null;
let cloudReady=false;
let activeUid=null;
let loadingUid=null;


function normalizePhone(value){
  let s=String(value||'').trim();
  if(s.startsWith('+')) return '+'+s.slice(1).replace(/\D/g,'');
  let d=s.replace(/\D/g,'');
  if(d.length===10) return '+91'+d;
  if(d.length===12 && d.startsWith('91')) return '+'+d;
  return '';
}

function phoneAlias(phone){
  return phone.replace(/\D/g,'')+'@mysalarybook.app';
}

function showAuthError(message){
  const box=document.getElementById('authError');
  if(box) box.textContent=message;
}

function showAuth(){
  document.body.classList.add('auth-required');
  document.getElementById('authScreen').style.display='block';
}

function toggleAuthMode(mode){
  document.getElementById('registerPanel').style.display=mode==='register'?'block':'none';
  document.getElementById('loginPanel').style.display=mode==='login'?'block':'none';
  document.getElementById('registerTab').classList.toggle('selected',mode==='register');
  document.getElementById('loginTab').classList.toggle('selected',mode==='login');
  showAuthError('');
}


async function createAccount(){
  try{
    const phone=normalizePhone(document.getElementById('regPhone').value);
    const password=document.getElementById('regPassword').value;
    const confirmPassword=document.getElementById('regConfirmPassword').value;

    if(!phone) return showAuthError('सही 10 अंकों का मोबाइल नंबर लिखें।');
    if(password.length<6) return showAuthError('पासवर्ड कम से कम 6 अक्षर का होना चाहिए।');
    if(password!==confirmPassword) return showAuthError('दोनों पासवर्ड एक जैसे नहीं हैं।');

    showAuthError('अकाउंट बनाया जा रहा है...');
    const credential=await createUserWithEmailAndPassword(
      auth,phoneAlias(phone),password
    );

    await setDoc(doc(firestore,'users',credential.user.uid,'profile','main'),{
      phone:phone,
      createdAt:new Date().toISOString()
    },{merge:true});

    await finishLogin(credential.user,true);
  }catch(error){
    console.error(error);
    if(error.code==='auth/email-already-in-use'){
      showAuthError('इस मोबाइल नंबर से अकाउंट पहले से बना है। Login करें।');
    }else if(error.code==='auth/weak-password'){
      showAuthError('पासवर्ड कम से कम 6 अक्षर का रखें।');
    }else{
      showAuthError('अकाउंट नहीं बना: '+error.message);
    }
  }
}

async function loginApp(){
  try{
    const phone=normalizePhone(document.getElementById('loginPhone').value);
    const password=document.getElementById('loginPassword').value;

    if(!phone) return showAuthError('सही मोबाइल नंबर लिखें।');
    if(!password) return showAuthError('पासवर्ड लिखें।');

    showAuthError('Login हो रहा है...');
    await signInWithEmailAndPassword(auth,phoneAlias(phone),password);
  }catch(error){
    console.error(error);
    showAuthError('Login नहीं हुआ। मोबाइल नंबर या पासवर्ड जाँचें।');
  }
}

async function finishLogin(user,showMessage){
  if(!user || !user.email) return;
  if(activeUid===user.uid && cloudReady) return;
  if(loadingUid===user.uid) return;

  loadingUid=user.uid;
  activeUid=user.uid;

  try{
    currentUser=user;
    cloudReady=false;

    const cloudRef=doc(firestore,'users',user.uid,'salaryBook','data');
    const cloudSnap=await getDoc(cloudRef);

    if(cloudSnap.exists() && cloudSnap.data().payload){
      db=cloudSnap.data().payload;
    }else{
      const personalCache=localStorage.getItem(KEY+'_'+user.uid);
      const oldData=localStorage.getItem(KEY);

      if(personalCache){
        db=JSON.parse(personalCache);
      }else if(oldData && confirm('इस ब्राउज़र में पुराना Salary Book डेटा मिला है। क्या इसे आपके Cloud अकाउंट में भेजना चाहते हैं?')){
        db=JSON.parse(oldData);
      }else{
        db={salary:8000,salaryDay:5,months:{}};
      }

      await setDoc(cloudRef,{
        payload:db,
        updatedAt:new Date().toISOString()
      });
    }

    if(!db || !db.months){
      db={salary:8000,salaryDay:5,months:{}};
    }

    cloudReady=true;
    document.body.classList.remove('auth-required');
    document.getElementById('authScreen').style.display='none';

    render();
    applyLanguage();
    save();

    if(showMessage) alert('Login सफलतापूर्वक हो गया!');
  }catch(error){
    console.error(error);
    currentUser=null;
    activeUid=null;
    cloudReady=false;
    showAuth();
    showAuthError('Cloud Database से कनेक्शन नहीं हुआ। इंटरनेट और Firestore Rules जाँचें।');
    try{await signOut(auth);}catch(e){}
  }finally{
    loadingUid=null;
  }
}

async function logoutApp(){
  if(!confirm('क्या आप Logout करना चाहते हैं?')) return;
  cloudReady=false;
  currentUser=null;
  activeUid=null;
  await signOut(auth);
  showAuth();
  toggleAuthMode('login');
  document.getElementById('loginPassword').value='';
}

let registrationInProgress=false;

onAuthStateChanged(auth,user=>{
  if(user && user.email){
    finishLogin(user,true);
  }else if(user && !registrationInProgress){
    signOut(auth);
  }else if(!user && !registrationInProgress){
    showAuth();
  }
});


function addPasswordEye(id){
  const input=document.getElementById(id);
  if(!input || input.dataset.eyeReady) return;
  input.dataset.eyeReady='yes';

  const wrap=document.createElement('div');
  wrap.style.cssText='display:flex;align-items:center;gap:6px;width:100%;margin-bottom:12px;';
  input.parentNode.insertBefore(wrap,input);
  wrap.appendChild(input);
  input.style.cssText+=';flex:1;min-width:0;margin:0;';

  const eye=document.createElement('button');
  eye.type='button';
  eye.textContent='👁️';
  eye.title='पासवर्ड दिखाएँ या छिपाएँ';
  eye.style.cssText='border:1px solid #d5e2f2;background:#f2f7ff;border-radius:9px;padding:10px 13px;font-size:19px;';
  eye.addEventListener('click',()=>{
    input.type=input.type==='password'?'text':'password';
    eye.textContent=input.type==='password'?'👁️':'🙈';
  });
  wrap.appendChild(eye);
}

function setupPasswordEyes(){
  ['regPassword','regConfirmPassword','loginPassword'].forEach(addPasswordEye);
}
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',setupPasswordEyes,{once:true});
}else{
  setupPasswordEyes();
}


Object.assign(window,{
  openScreen,goHome,addAdvance,receiveSalary,removeEntry,
  saveSalary,saveSalaryDay,changeLanguage,
  toggleAuthMode,createAccount,
  loginApp,logoutApp
});

window.createAccount=createAccount;
window.loginApp=loginApp;
