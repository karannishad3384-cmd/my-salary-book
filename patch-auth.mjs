import fs from 'node:fs';

let html = fs.readFileSync('index.html', 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>/);

if (!match) {
  console.log('ERROR: पुराना script नहीं मिला।');
  process.exit(1);
}

let oldJS = match[1];

oldJS = oldJS.replace(
  "let db=JSON.parse(localStorage.getItem(KEY)||'null')||{salary:8000,salaryDay:5,months:{}};",
  "let db={salary:8000,salaryDay:5,months:{}};"
);

oldJS = oldJS.replace(
  "function save(){localStorage.setItem(KEY,JSON.stringify(db))}",
  `function save(){
    if(!currentUser) return;
    const value=JSON.stringify(db);
    localStorage.setItem(KEY+'_'+currentUser.uid,value);
    if(cloudReady){
      setDoc(doc(firestore,'users',currentUser.uid,'salaryBook','data'),
        {payload:db,updatedAt:new Date().toISOString()},{merge:true}
      ).catch(e=>console.error('Cloud save error:',e));
    }
  }`
);

if (oldJS.includes("let db=JSON.parse(localStorage.getItem(KEY)")) {
  console.log('ERROR: Database initialization बदल नहीं पाया।');
  process.exit(1);
}

const authCode = `

let currentUser=null;
let cloudReady=false;
let activeUid=null;
let loadingUid=null;
let registrationInProgress=false;
let confirmationResult=null;
let recaptchaVerifier=null;
let registrationPhone='';
let registrationPassword='';

function normalizePhone(value){
  let s=String(value||'').trim();
  if(s.startsWith('+')) return '+'+s.slice(1).replace(/\\D/g,'');
  let d=s.replace(/\\D/g,'');
  if(d.length===10) return '+91'+d;
  if(d.length===12 && d.startsWith('91')) return '+'+d;
  return '';
}

function phoneAlias(phone){
  return phone.replace(/\\D/g,'')+'@mysalarybook.app';
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

async function sendRegistrationOtp(){
  try{
    const phone=normalizePhone(document.getElementById('regPhone').value);
    const password=document.getElementById('regPassword').value;
    const confirmPassword=document.getElementById('regConfirmPassword').value;

    if(!phone) return showAuthError('सही 10 अंकों का मोबाइल नंबर लिखें।');
    if(password.length<6) return showAuthError('पासवर्ड कम से कम 6 अक्षर का होना चाहिए।');
    if(password!==confirmPassword) return showAuthError('दोनों पासवर्ड एक जैसे नहीं हैं।');

    registrationPhone=phone;
    registrationPassword=password;
    registrationInProgress=true;
    showAuthError('OTP भेजा जा रहा है...');

    if(recaptchaVerifier){
      recaptchaVerifier.clear();
      recaptchaVerifier=null;
    }

    recaptchaVerifier=new RecaptchaVerifier(auth,'recaptcha-container',{
      size:'normal'
    });

    await recaptchaVerifier.render();
    confirmationResult=await signInWithPhoneNumber(auth,phone,recaptchaVerifier);

    document.getElementById('otpArea').style.display='block';
    showAuthError('OTP आपके मोबाइल पर भेज दिया गया है।');
  }catch(error){
    registrationInProgress=false;
    showAuthError('OTP नहीं भेजा गया: '+error.message);
    console.error(error);
  }
}

async function verifyOtpAndRegister(){
  try{
    const otp=document.getElementById('regOtp').value.trim();
    if(!confirmationResult) return showAuthError('पहले OTP भेजें।');
    if(!/^\\d{6}$/.test(otp)) return showAuthError('6 अंकों का OTP लिखें।');

    showAuthError('OTP सत्यापित हो रहा है...');
    const result=await confirmationResult.confirm(otp);

    const credential=EmailAuthProvider.credential(
      phoneAlias(registrationPhone),
      registrationPassword
    );

    await linkWithCredential(result.user,credential);

    await setDoc(doc(firestore,'users',result.user.uid,'profile','main'),{
      phone:registrationPhone,
      createdAt:new Date().toISOString()
    },{merge:true});

    registrationInProgress=false;
    confirmationResult=null;
    await finishLogin(result.user,true);
  }catch(error){
    registrationInProgress=false;
    showAuthError('Registration में समस्या: '+error.message);
    console.error(error);
    try{await signOut(auth);}catch(e){}
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
    showAuthError('Login नहीं हुआ। मोबाइल नंबर या पासवर्ड जाँचें।');
    console.error(error);
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

onAuthStateChanged(auth,user=>{
  if(user && user.email){
    finishLogin(user,true);
  }else if(user && !registrationInProgress){
    signOut(auth);
  }else if(!user && !registrationInProgress){
    showAuth();
  }
});

Object.assign(window,{
  openScreen,goHome,addAdvance,receiveSalary,removeEntry,
  saveSalary,saveSalaryDay,changeLanguage,
  toggleAuthMode,sendRegistrationOtp,verifyOtpAndRegister,
  loginApp,logoutApp
});
`;

const imports = `
import { auth, firestore } from './firebase.js';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  EmailAuthProvider,
  linkWithCredential,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
`;

fs.writeFileSync('src/main.js', imports + oldJS + authCode);

const authCSS = `
body.auth-required header,body.auth-required main{display:none!important}
body.auth-required #authScreen{display:block!important}
#authScreen{display:none;min-height:100vh;padding:28px 18px;background:#f2f6fc}
.auth-card{max-width:440px;margin:35px auto;background:white;padding:24px 20px;border-radius:22px;box-shadow:0 8px 30px #173b6615}
.auth-logo{text-align:center;color:#0759b5;font-size:23px;font-weight:bold}
.auth-sub{text-align:center;color:#8292a5;font-size:13px;margin:8px 0 23px}
.auth-tabs{display:flex;gap:8px;margin-bottom:20px}
.auth-tabs button{flex:1;padding:12px;border:0;border-radius:10px;background:#edf3fa;color:#42617e;font-weight:bold}
.auth-tabs button.selected{background:#0759b5;color:white}
.auth-card input{margin:8px 0 15px}
.auth-card label{display:block}
.auth-card .primary{margin-top:8px}
.auth-error{font-size:13px;color:#d04444;line-height:1.5;margin:12px 0}
#recaptcha-container{margin:12px 0;overflow:hidden}
.auth-note{text-align:center;color:#8795a6;font-size:11px;margin-top:18px}
`;

const authHTML = `
<section id="authScreen">
  <div class="auth-card">
    <div class="auth-logo">💰 MY SALARY BOOK</div>
    <div class="auth-sub">आपका अपना सुरक्षित सैलरी हिसाब</div>

    <div class="auth-tabs">
      <button id="registerTab" class="selected" onclick="toggleAuthMode('register')">नया Registration</button>
      <button id="loginTab" onclick="toggleAuthMode('login')">Login</button>
    </div>

    <div id="registerPanel">
      <label>मोबाइल नंबर</label>
      <input id="regPhone" type="tel" placeholder="10 अंकों का मोबाइल नंबर">
      <label>नया पासवर्ड</label>
      <input id="regPassword" type="password" placeholder="कम से कम 6 अक्षर">
      <label>पासवर्ड दोबारा लिखें</label>
      <input id="regConfirmPassword" type="password" placeholder="पासवर्ड कन्फर्म करें">
      <button class="primary" onclick="sendRegistrationOtp()">मोबाइल पर OTP भेजें</button>

      <div id="otpArea" style="display:none">
        <label>OTP नंबर</label>
        <input id="regOtp" type="number" inputmode="numeric" placeholder="6 अंकों का OTP">
        <button class="primary" onclick="verifyOtpAndRegister()">OTP Verify करके Registration करें</button>
      </div>
      <div id="recaptcha-container"></div>
    </div>

    <div id="loginPanel" style="display:none">
      <label>मोबाइल नंबर</label>
      <input id="loginPhone" type="tel" placeholder="Registration वाला मोबाइल नंबर">
      <label>पासवर्ड</label>
      <input id="loginPassword" type="password" placeholder="अपना पासवर्ड लिखें">
      <button class="primary" onclick="loginApp()">Login करें</button>
    </div>

    <div id="authError" class="auth-error"></div>
    <div class="auth-note">आपका डेटा आपके अपने Cloud अकाउंट में सुरक्षित रहेगा।</div>
  </div>
</section>
`;

if (!html.includes('id="authScreen"')) {
  html = html.replace('</style>', authCSS + '\n</style>');
  html = html.replace('<body>', '<body class="auth-required">');
  html = html.replace('<header>', authHTML + '\n<header>');
  html = html.replace(
    '<div class="owner">👤 PERSONAL</div>',
    '<div class="owner">👤 PERSONAL <button onclick="logoutApp()" style="border:0;border-radius:8px;padding:6px;margin-left:5px">Logout</button></div>'
  );
}

html = html.replace(match[0], '<script type="module" src="/src/main.js"></script>');
fs.writeFileSync('index.html', html);

console.log('Firebase Login और Registration कोड जोड़ा गया।');
