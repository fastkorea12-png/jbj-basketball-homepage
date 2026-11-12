/* JBJ B안: 헤더 배경, 스크롤 등장, 숫자 카운트 */
(function(){
  var hd=document.getElementById('hd');
  var onS=function(){hd.classList.toggle('on',scrollY>40)};
  addEventListener('scroll',onS,{passive:true});onS();
  var calm=matchMedia('(prefers-reduced-motion:reduce)').matches;
  var els=document.querySelectorAll('.rv');
  if(calm||!('IntersectionObserver' in window)){els.forEach(function(e){e.classList.add('in')});return}
  var io=new IntersectionObserver(function(es){es.forEach(function(x){
    if(!x.isIntersecting)return;
    x.target.classList.add('in');io.unobserve(x.target);
    var b=x.target.querySelector('[data-n]');
    if(b){var n=+b.dataset.n,t0=performance.now(),d=900;
      (function step(t){var p=Math.min(1,(t-t0)/d);b.textContent=Math.round(n*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(step)})(t0);}
  })},{threshold:.18});
  els.forEach(function(e){io.observe(e)});
})();
