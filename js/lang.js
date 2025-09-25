$menu.addEventListener('click', (e)=>{
  const btn = e.target.closest('li[data-lang], button[data-lang]');
  if (!btn) return;

  // 1) 取得語言碼（en / zh-tw / ja ...）並正規化成 zh_tw
  const codeRaw = btn.dataset.lang;
  const code = codeRaw.toLowerCase().replace('-', '_');

  // 2) 切換 i18n（真的去換）
  if (window.I18N?.setLang) {
    I18N.setLang(code);
  } else {
    console.warn('[i18n] I18N 未載入或順序在後面');
  }

  // 3) 更新按鈕顯示文字（母語名稱）
  $cur.textContent = btn.textContent.trim();

  close();
});
