const g=document.getElementById('gnb'),ms=document.querySelectorAll('.menu');
const set=o=>{g.classList.toggle('open',o);document.body.classList.toggle('sheet-open',o);ms.forEach(m=>m.setAttribute('aria-expanded',o))};
ms.forEach(m=>m.addEventListener('click',e=>{e.stopPropagation();set(!g.classList.contains('open'))}));
g.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>set(false)));
document.addEventListener('click',e=>{if(g.classList.contains('open')&&!g.contains(e.target))set(false)});
document.addEventListener('keydown',e=>{if(e.key==='Escape')set(false)});
const f=document.getElementById('cform');
if(f){
const done=document.getElementById('cdone');
const kinds=f.querySelectorAll('input[name=kind]'),grade=document.getElementById('f-grade');
kinds.forEach(k=>k.addEventListener('change',()=>{grade.hidden=f.kind.value==='코트 대관'}));
const tel=document.getElementById('c-tel'),et=document.getElementById('e-tel'),ef=document.getElementById('e-form');
const telOk=v=>/^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(v.replace(/\s/g,''));
f.addEventListener('input',e=>{if(e.target.getAttribute('aria-invalid')){e.target.removeAttribute('aria-invalid');if(e.target===tel)et.textContent=''}});
f.addEventListener('submit',e=>{e.preventDefault();
  const need=[['c-branch','지점을 선택해 주세요.'],['c-name','보호자 이름을 적어 주세요.'],['c-tel','연락처를 적어 주세요.']];
  f.querySelectorAll('[aria-invalid]').forEach(x=>x.removeAttribute('aria-invalid'));
  let first=null,msg='';
  for(const [id,m] of need){const el=document.getElementById(id);if(!el.value.trim()){el.setAttribute('aria-invalid','true');if(!first){first=el;msg=m}}}
  et.textContent='';if(!first&&!telOk(tel.value)){tel.setAttribute('aria-invalid','true');first=tel;msg='연락처를 010-1234-5678 형식으로 적어 주세요.';et.textContent=msg}
  const ag=document.getElementById('c-agree');if(!first&&!ag.checked){first=ag;msg='개인정보 수집·이용에 동의해 주세요.'}
  if(first){ef.textContent=msg;first.focus();return}
  ef.textContent='';
  const times=[...f.querySelectorAll('input[name=time]:checked')].map(x=>x.value).join(', ')||'시간 무관';
  document.getElementById('cdone-sum').textContent=`${f.kind.value} · ${f.branch.value}${grade.hidden||!f.grade.value?'':' · '+f.grade.value} · ${times}`;
  f.hidden=true;done.hidden=false;done.focus();
});
}
/* 모바일: 아래로 스크롤하면 상단 헤더를 숨기고, 위로 올리면 다시 보여 준다 */
(()=>{let y=scrollY,t=false;const mq=matchMedia('(max-width:860px)');
addEventListener('scroll',()=>{if(t)return;t=true;requestAnimationFrame(()=>{const n=scrollY,b=document.body;
  if(!mq.matches||n<80||document.body.classList.contains('sheet-open'))b.classList.remove('hd-hide');
  else if(n>y+6)b.classList.add('hd-hide');else if(n<y-6)b.classList.remove('hd-hide');
  y=n;t=false})},{passive:true})})();
