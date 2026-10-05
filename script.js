const nav=document.getElementById('nav'),menuBtn=document.getElementById('menuBtn'),themeBtn=document.getElementById('themeBtn'),langBtn=document.getElementById('langBtn'),toast=document.getElementById('toast');
const WHATSAPP_NUMBER='251956144830'; // Replace with your real WhatsApp number.
function showToast(msg){toast.textContent=msg;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),3000)}
menuBtn.addEventListener('click',()=>nav.classList.toggle('open'));
document.querySelectorAll('nav a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')));
const savedTheme=localStorage.getItem('theme');if(savedTheme==='light'){document.body.classList.add('light');themeBtn.textContent='☀'}
themeBtn.addEventListener('click',()=>{document.body.classList.toggle('light');const light=document.body.classList.contains('light');localStorage.setItem('theme',light?'light':'dark');themeBtn.textContent=light?'☀':'☾'});
let language=localStorage.getItem('language')||'om';
function setLanguage(lang){language=lang;localStorage.setItem('language',lang);document.documentElement.lang=lang;document.querySelectorAll('[data-om][data-en]').forEach(el=>el.textContent=el.dataset[lang]);langBtn.textContent=lang==='om'?'EN':'OR'}
langBtn.addEventListener('click',()=>setLanguage(language==='om'?'en':'om'));setLanguage(language);
document.getElementById('year').textContent=new Date().getFullYear();
document.getElementById('whatsappLink').href=`https://wa.me/${WHATSAPP_NUMBER}`;
document.querySelectorAll('.course-btn').forEach(btn=>btn.addEventListener('click',()=>{document.getElementById('studentCourse').value=btn.dataset.course;document.getElementById('register').scrollIntoView({behavior:'smooth'});}));
document.getElementById('registrationForm').addEventListener('submit',e=>{e.preventDefault();const name=document.getElementById('studentName').value.trim(),phone=document.getElementById('studentPhone').value.trim(),course=document.getElementById('studentCourse').value,message=document.getElementById('studentMessage').value.trim();const text=`Hello Abadir IT Academy,%0A%0AI want to register.%0AName: ${encodeURIComponent(name)}%0APhone: ${encodeURIComponent(phone)}%0ACourse: ${encodeURIComponent(course)}%0AMessage: ${encodeURIComponent(message||'No additional message')}`;window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`,'_blank');showToast(language==='om'?'WhatsApp banamuuf qophaa’e.':'WhatsApp message is ready.');});
