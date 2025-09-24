(function(){
  const LANG_KEY = 'ks_lang';
  const I18N_DIR = 'i18n';
  const DEFAULT_LANG = 'en';

  // 支援語言
  const SUPPORTED = [
    'en','zh-tw','zh-cn','ja','ko','fr','de','es','it','pt-br',
    'id','ms','th','vi','ar','hi','ru'
  ];
  // 母語名稱
  const LABEL = {
    'en':'English','zh-tw':'繁體中文','zh-cn':'简体中文','ja':'日本語','ko':'한국어',
    'fr':'Français','de':'Deutsch','es':'Español','it':'Italiano','pt-br':'Português (Brasil)',
    'id':'Bahasa Indonesia','ms':'Bahasa Melayu','th':'ไทย','vi':'Tiếng Việt',
    'ar':'العربية','hi':'हिन्दी','ru':'Русский'
  };

  const state = { lang: localStorage.getItem(LANG_KEY) || DEFAULT_LANG, dict:{} };

  async function loadDict(lang){
    try{
      const res = await fetch(`${I18N_DIR}/${lang}.json`, { cache:'no-store' });
      if(!res.ok) throw new Error(res.statusText);
      return res.json();
    }catch(e){
      console.warn('[i18n] load failed', lang, e);
      return {};
    }
  }

  function applyTexts(){
    document.querySelectorAll('[data-i18n]').forEach(el=>{
      const key = el.getAttribute('data-i18n');
      const val = key.split('.').reduce((o,k)=>o?.[k], state.dict);
      if (typeof val === 'string') el.textContent = val;
    });
    document.documentElement.lang = state.lang;
  }

  async function setLang(lang){
    if(!SUPPORTED.includes(lang)) lang = DEFAULT_LANG;
    state.dict = await loadDict(lang);
    state.lang = lang;
    localStorage.setItem(LANG_KEY, lang);
    applyTexts();

    // 更新按鈕文字
    const cur = document.getElementById('langCurrent');
    if(cur) cur.textContent = LABEL[lang] || lang;
  }

  function mountDropdown(){
    const btn  = document.getElementById('langBtn');
    const menu = document.getElementById('langMenu');
    const cur  = document.getElementById('langCurrent');
    if(!btn || !menu) return;

    // 動態產生語言清單
    menu.innerHTML = SUPPORTED.map(code=>{
      const name = LABEL[code] || code;
      const active = code === state.lang ? ' aria-current="true"' : '';
      return `<li role="menuitem" data-lang="${code}"${active}>${name}</li>`;
    }).join('');
    if(cur) cur.textContent = LABEL[state.lang] || state.lang;

    // 切換開關
    btn.addEventListener('click', e=>{
      e.stopPropagation();
      const open = !menu.classList.contains('open');
      menu.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
    });

    // 點選語言
    menu.addEventListener('click', e=>{
      const li = e.target.closest('li[data-lang]');
      if(!li) return;
      setLang(li.dataset.lang);
      menu.querySelectorAll('[aria-current="true"]').forEach(el=>el.removeAttribute('aria-current'));
      li.setAttribute('aria-current','true');
      menu.classList.remove('open');
      btn.setAttribute('aria-expanded','false');
    });

    // 點擊外面收起
    document.addEventListener('click', ev=>{
      if(!btn.contains(ev.target) && !menu.contains(ev.target)){
        menu.classList.remove('open');
        btn.setAttribute('aria-expanded','false');
      }
    });
    document.addEventListener('keydown', ev=>{
      if(ev.key==='Escape'){
        menu.classList.remove('open');
        btn.setAttribute('aria-expanded','false');
      }
    });
  }

  // 初始化
  document.addEventListener('DOMContentLoaded', async ()=>{
    mountDropdown();
    await setLang(state.lang);
  });
})();
