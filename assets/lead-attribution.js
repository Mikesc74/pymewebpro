/* PymeWebPro · lead-attribution.js · UTM + ref capture, WA + Cal prefill, /api/leads forward. Vanilla ES5. */
(function(){
  'use strict';
  var KEY='pwp_attribution';
  var ATTR=['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid','ref'];
  var ENDPOINTS=['/api/leads','portal.pymewebpro.com/api/leads','colguides.com/portal/pymewebpro/api/leads'];
  var DEFAULT_WA='Hola, vengo de pymewebpro.com';
  var store=null;
  try{var t='__pwp__';sessionStorage.setItem(t,'1');sessionStorage.removeItem(t);store=sessionStorage;}catch(e){}

  function read(){if(!store)return{};try{var r=store.getItem(KEY);if(!r)return{};var p=JSON.parse(r);return(p&&typeof p==='object')?p:{};}catch(e){return{};}}
  function write(b){if(!store)return;try{store.setItem(KEY,JSON.stringify(b));}catch(e){}}

  function capture(){
    var s=read(),changed=false,p;
    try{p=new URLSearchParams(window.location.search||'');}catch(e){return s;}
    for(var i=0;i<ATTR.length;i++){var k=ATTR[i],v=p.get(k);if(v&&!s[k]){s[k]=v;changed=true;}}
    if(!s.referrer){
      var ref=(document.referrer||'').trim();
      if(ref){
        var here='',rh='';
        try{here=window.location.host;}catch(e){}
        try{rh=new URL(ref).host;}catch(e){}
        if(rh&&rh!==here){s.referrer=ref;changed=true;}
      }
    }
    if(!s.landing_page){s.landing_page=window.location.pathname+window.location.search;changed=true;}
    if(!s.first_seen_at){s.first_seen_at=Date.now();changed=true;}
    if(changed)write(s);
    return s;
  }

  function get(){
    var b=read(),o={};
    for(var k in b){if(Object.prototype.hasOwnProperty.call(b,k)&&b[k])o[k]=b[k];}
    var c=window.PWP_PAGE_CONTEXT;
    if(c&&typeof c==='object'){
      if(c.industry&&!o.industry)o.industry=c.industry;
      if(c.city&&!o.city)o.city=c.city;
    }
    o.user_agent=navigator.userAgent||'';
    return o;
  }

  function stamp(){
    var b=read(),bits=[];
    if(b.utm_campaign)bits.push('camp='+b.utm_campaign);
    else if(b.utm_source)bits.push('src='+b.utm_source);
    if(b.gclid)bits.push('gclid');
    if(b.fbclid)bits.push('fbclid');
    if(!bits.length&&b.referrer){try{bits.push('ref='+new URL(b.referrer).host);}catch(e){}}
    return bits.join(' ');
  }

  function forward(form){
    if(!form||form.nodeName!=='FORM')return;
    var b=get();
    for(var k in b){
      if(!Object.prototype.hasOwnProperty.call(b,k)||!b[k])continue;
      var ex=form.querySelector('input[type="hidden"][data-pwp-attr="'+k+'"]');
      if(ex){ex.value=String(b[k]);continue;}
      var i=document.createElement('input');
      i.type='hidden';i.name='pwp_'+k;i.value=String(b[k]);
      i.setAttribute('data-pwp-attr',k);
      form.appendChild(i);
    }
  }

  function hasQ(u,k){return u&&(u.indexOf('?'+k+'=')!==-1||u.indexOf('&'+k+'=')!==-1);}

  function waPrefill(base,msg){
    if(!base||hasQ(base,'text'))return base;
    var m=(msg||DEFAULT_WA).trim(),s=stamp();
    if(s)m=m+' [attr: '+s+']';
    return base+(base.indexOf('?')===-1?'?':'&')+'text='+encodeURIComponent(m);
  }

  function calPrefill(base,ctx){
    if(!base)return base;
    ctx=ctx||{};
    var notes=[];
    if(ctx.notes)notes.push(String(ctx.notes));
    if(ctx.plan)notes.push('Plan: '+ctx.plan);
    var s=stamp();if(s)notes.push(s);
    var x=[];
    if(ctx.name)x.push('name='+encodeURIComponent(ctx.name));
    if(ctx.email)x.push('email='+encodeURIComponent(ctx.email));
    if(notes.length)x.push('notes='+encodeURIComponent(notes.join(' · ')));
    if(!x.length||base.indexOf('?')!==-1)return base;
    return base+'?'+x.join('&');
  }

  function title(){
    var t=(document.title||'').replace(/\s+/g,' ').trim();
    return t.length>80?t.slice(0,77)+'...':t;
  }

  function decorate(){
    var as=document.querySelectorAll('a[href]'),tt=title();
    var waMsg=DEFAULT_WA+(tt?' ('+tt+')':'');
    for(var i=0;i<as.length;i++){
      var a=as[i],h=a.getAttribute('href')||'';
      if(!h||h.charAt(0)==='#'||h.indexOf('mailto:')===0)continue;
      if(h.indexOf('wa.me/')!==-1){
        if(hasQ(h,'text'))continue;
        a.setAttribute('href',waPrefill(h,waMsg));
      }else if(h.indexOf('cal.com/')!==-1){
        if(h.indexOf('?')!==-1)continue;
        a.setAttribute('href',calPrefill(h,{notes:tt?('Vengo de '+tt):'Vengo de pymewebpro.com'}));
      }
    }
  }

  function isLeadForm(f){
    if(!f)return false;
    if(f.getAttribute('data-pwp-form')==='true')return true;
    var a=(f.getAttribute('action')||'').toLowerCase();
    for(var i=0;i<ENDPOINTS.length;i++){if(a.indexOf(ENDPOINTS[i])!==-1)return true;}
    return false;
  }

  function wireForms(){
    var fs=document.querySelectorAll('form');
    for(var i=0;i<fs.length;i++){if(isLeadForm(fs[i]))forward(fs[i]);}
  }

  capture();
  window.PwpAttribution={get:get,forward:forward,waPrefill:waPrefill,calPrefill:calPrefill};

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){decorate();wireForms();});
  }else{decorate();wireForms();}
})();
