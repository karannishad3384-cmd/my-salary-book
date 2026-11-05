import fs from 'fs';

let js = fs.readFileSync('src/main.js', 'utf8');

// Firebase observer के लिए जरूरी variable वापस जोड़ें
if (!js.includes('let registrationInProgress=false')) {
  js = js.replace(
    'onAuthStateChanged(auth,user=>',
    'let registrationInProgress=false;\n\nonAuthStateChanged(auth,user=>'
  );
}

// Password eye को DOM तैयार होने के बाद चलाएँ
js = js.replace(
  /\\?\['regPassword','regConfirmPassword','loginPassword'\]\.forEach\(addPasswordEye\);/,
  `function setupPasswordEyes(){
  ['regPassword','regConfirmPassword','loginPassword'].forEach(addPasswordEye);
}
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',setupPasswordEyes,{once:true});
}else{
  setupPasswordEyes();
}`
);

// Inline HTML buttons के लिए functions स्पष्ट रूप से global करें
if (!js.includes('window.createAccount=createAccount')) {
  js += '\nwindow.createAccount=createAccount;\nwindow.loginApp=loginApp;\n';
}

fs.writeFileSync('src/main.js', js);
console.log('Auth और Password Eye सुधार लागू हो गए।');
