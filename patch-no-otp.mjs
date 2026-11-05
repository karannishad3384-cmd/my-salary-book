import fs from 'fs';

let js = fs.readFileSync('src/main.js','utf8');
let html = fs.readFileSync('index.html','utf8');

// Firebase Auth imports: OTP हटाएँ
js = js.replace(
  /import\s*\{[\s\S]*?\}\s*from ['"]firebase\/auth['"];/,
  `import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';`
);

// OTP registration और पुराने login functions बदलें
const start = js.indexOf('async function sendRegistrationOtp()');
const end = js.indexOf('async function finishLogin(', start);

if(start === -1 || end === -1) {
  throw new Error('Registration code नहीं मिला। कोई बदलाव सेव नहीं हुआ।');
}

js = js.slice(0,start) + `
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

` + js.slice(end);

// OTP variables हटाएँ
js = js.replace(
  /let registrationInProgress=false;[\s\S]*?let registrationPassword='';/,
  ''
);

// Password के लिए आँख वाला बटन जोड़ें
const eyeCode = `
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

['regPassword','regConfirmPassword','loginPassword'].forEach(addPasswordEye);
`;

// पुराने OTP HTML हटाएँ और नया Registration बटन लगाएँ
html = html.replace(
  /<button class="primary" onclick="sendRegistrationOtp\(\)">[\s\S]*?<\/button>\s*<div id="otpArea"[\s\S]*?<\/div>\s*<div id="recaptcha-container"><\/div>/,
  '<button class="primary" onclick="createAccount()">मोबाइल नंबर और पासवर्ड से अकाउंट बनाएँ</button>'
);

if(html.includes('sendRegistrationOtp') || html.includes('verifyOtpAndRegister')) {
  throw new Error('HTML में OTP का पुराना कोड बाकी है। बदलाव सेव नहीं हुआ।');
}

js = js.replace(
  '  toggleAuthMode,sendRegistrationOtp,verifyOtpAndRegister,\n  loginApp,logoutApp',
  '  toggleAuthMode,createAccount,\n  loginApp,logoutApp'
);

js = js.replace(
  'Object.assign(window,{\n  openScreen',
  eyeCode + '\n\nObject.assign(window,{\n  openScreen'
);

fs.writeFileSync('src/main.js',js);
fs.writeFileSync('index.html',html);

console.log('OTP हटाया गया। Phone + Password Registration/Login और Password Eye जोड़े गए।');
