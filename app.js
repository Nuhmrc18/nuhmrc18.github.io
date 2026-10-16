(() => {
  const input = document.querySelector('#fileInput');
  const dropzone = document.querySelector('#dropzone');
  const message = document.querySelector('#message');
  const primaryButton = document.querySelector('#chooseFile');
  const selectedInfo = document.querySelector('#selectedInfo');
  const uploadFeedback = document.querySelector('#uploadFeedback');
  let selectedFile = null;
  let feedbackTimers = [];
  const maxBytes = 50 * 1024 * 1024;

  function showMessage(text) {
    message.textContent = text;
    message.hidden = !text;
  }
  function showFeedback(success) {
    feedbackTimers.forEach(clearTimeout);
    feedbackTimers = [];
    uploadFeedback.className = 'upload-feedback';
    dropzone.classList.toggle('success-state', success);
    dropzone.classList.remove('returning-state');
    void uploadFeedback.offsetWidth;
    uploadFeedback.className = `upload-feedback is-visible ${success ? 'success' : 'failure'}`;
    if (success) {
      const iconRect = dropzone.querySelector('.file-icon').getBoundingClientRect();
      const feedbackRect = uploadFeedback.getBoundingClientRect();
      uploadFeedback.style.setProperty('--return-x', `${iconRect.left + iconRect.width / 2 - (feedbackRect.left + feedbackRect.width / 2)}px`);
      uploadFeedback.style.setProperty('--return-y', `${iconRect.top + iconRect.height / 2 - (feedbackRect.top + feedbackRect.height / 2)}px`);
      feedbackTimers.push(setTimeout(() => {
        uploadFeedback.classList.add('is-returning');
        dropzone.classList.add('returning-state');
      }, 3440));
      feedbackTimers.push(setTimeout(() => {
        dropzone.classList.remove('success-state', 'returning-state');
        uploadFeedback.className = 'upload-feedback';
        uploadFeedback.style.removeProperty('--return-x');
        uploadFeedback.style.removeProperty('--return-y');
      }, 4100));
    }
  }
  function resetSelection() {
    feedbackTimers.forEach(clearTimeout);
    feedbackTimers = [];
    selectedFile = null;
    input.value = '';
    primaryButton.textContent = 'Dosya seç';
    showMessage('');
    dropzone.classList.remove('success-state');
    dropzone.classList.remove('returning-state');
    uploadFeedback.className = 'upload-feedback';
    uploadFeedback.style.removeProperty('--return-x');
    uploadFeedback.style.removeProperty('--return-y');
    selectedInfo.textContent = 'Dosya seçimi cihazındaki dosya seçiciyi açar.';
  }
  function extensionOf(file) { return (file.name.split('.').pop() || '').toLowerCase(); }
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }
  function chooseFile() {
    input.click();
  }
  function selectFile(file) {
    resetSelection();
    if (!file) return;
    if (file.size > maxBytes) { showFeedback(false); return showMessage('Dosya boyutu 50 MB sınırını aşıyor.'); }
    selectedFile = file;
    selectedInfo.textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`;
    primaryButton.textContent = extensionOf(file) === 'pdf' ? 'PDF’yi yeni sekmede aç →' : 'Dosyayı yeni sekmede aç →';
    showFeedback(true);
    showMessage('Dosya hazır. Açmak için aşağıdaki düğmeye bas.');
  }
  async function openFile(file, tab) {
    if (!file) { if (tab && !tab.closed) tab.close(); return; }
    try {
      let url;
      const ext = extensionOf(file);
      if (ext === 'pdf' || file.type === 'application/pdf') {
        const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
        if (new TextDecoder().decode(header) !== '%PDF-') throw new Error('Bu dosya geçerli bir PDF gibi görünmüyor.');
        url = URL.createObjectURL(new Blob([file], { type: 'application/pdf' }));
      } else if (ext === 'docx') {
        const paragraphs = await extractDocx(file);
        url = URL.createObjectURL(new Blob([docxPage(file.name, paragraphs)], { type: 'text/html;charset=utf-8' }));
      } else if (file.type.startsWith('image/') || file.type.startsWith('audio/') || file.type.startsWith('video/')) {
        url = URL.createObjectURL(file);
      } else if (file.type.startsWith('text/') || ['txt','md','csv','log','json','xml','html','htm','css','js','ts','py','php','yaml','yml','ini','svg'].includes(ext)) {
        url = URL.createObjectURL(new Blob([textPage(file.name, await file.text())], { type: 'text/html;charset=utf-8' }));
      } else {
        const downloadUrl = URL.createObjectURL(file);
        url = URL.createObjectURL(new Blob([fallbackPage(file, downloadUrl)], { type: 'text/html;charset=utf-8' }));
      }
      if (tab) tab.location.replace(url);
      resetSelection();
      showMessage(`${file.name} yeni sekmede açıldı.`);
    } catch (error) {
      if (tab && !tab.closed) tab.close();
      showFeedback(false);
      showMessage(error instanceof Error ? error.message : 'Dosya açılamadı.');
    }
  }

  function textPage(name, text) {
    return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(name)}</title><style>body{margin:0;background:#f4f7fb;color:#24334a;font:15px/1.7 system-ui,Arial,sans-serif}.page{box-sizing:border-box;max-width:1000px;min-height:100vh;margin:28px auto;padding:28px clamp(18px,5vw,56px);background:white;box-shadow:0 12px 40px #1c3b6614}h1{font-size:14px;color:#64748b;border-bottom:1px solid #e5eaf2;padding-bottom:14px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.7 ui-monospace,Consolas,monospace}</style></head><body><main class="page"><h1>${escapeHtml(name)}</h1><pre>${escapeHtml(text)}</pre></main></body></html>`;
  }

  function fallbackPage(file, url) {
    const name = escapeHtml(file.name);
    const type = escapeHtml(file.type || 'Tanımlanamayan dosya türü');
    return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${name} · CepDosya</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f7fb;color:#18243b;font:15px/1.6 system-ui,Arial,sans-serif}.card{width:min(520px,calc(100% - 40px));padding:30px;background:#fff;border:1px solid #e5eaf2;border-radius:20px;box-shadow:0 14px 40px #182a4a12;text-align:center}.muted{color:#77839a;font-size:13px}.button{display:inline-block;margin-top:14px;padding:12px 18px;border-radius:10px;background:#2864e8;color:white;text-decoration:none;font-weight:700}</style></head><body><main class="card"><div style="font-size:36px">📄</div><h2>${name}</h2><p class="muted">${type} · ${(file.size / 1024 / 1024).toFixed(2)} MB</p><p>Bu dosya türü tarayıcıda doğrudan önizlenemiyor. İndirip cihazındaki uyumlu uygulamayla açabilirsin.</p><a class="button" href="${url}" download="${name}">Dosyayı indir</a></main></body></html>`;
  }

  function docxPage(name, paragraphs) {
    const content = paragraphs.length ? paragraphs.map(text => `<p>${escapeHtml(text) || '&nbsp;'}</p>`).join('') : '<p>Bu belgede görüntülenecek metin bulunamadı.</p>';
    return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(name)}</title><style>body{margin:0;background:#f4f7fb;color:#24334a;font:16px/1.8 Georgia,serif}.page{box-sizing:border-box;max-width:850px;min-height:100vh;margin:36px auto;padding:60px clamp(24px,8vw,90px);background:white;box-shadow:0 12px 40px #1c3b6614}h1{font:700 13px Arial,sans-serif;color:#70809a;border-bottom:1px solid #e7ebf1;padding-bottom:16px;margin:0 0 34px;overflow-wrap:anywhere}p{white-space:pre-wrap;margin:0 0 14px}@media(max-width:600px){.page{margin:0;padding:32px 22px}}</style></head><body><main class="page"><h1>${escapeHtml(name)}</h1>${content}</main></body></html>`;
  }

  async function extractDocx(file) {
    if (typeof DecompressionStream === 'undefined') throw new Error('DOCX açmak için güncel Chrome veya Edge kullan. PDF dosyaları doğrudan açılabilir.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let eocd = -1;
    for (let i = Math.max(0, bytes.length - 22 - 65535); i <= bytes.length - 22; i++) {
      if (view.getUint32(i, true) === 0x06054b50) eocd = i;
    }
    if (eocd < 0) throw new Error('DOCX arşivi okunamadı. Dosyanın sağlam olduğundan emin ol.');
    const entries = view.getUint16(eocd + 10, true);
    let cursor = view.getUint32(eocd + 16, true);
    let xmlBytes = null;
    for (let i = 0; i < entries; i++) {
      if (view.getUint32(cursor, true) !== 0x02014b50) throw new Error('DOCX içeriği beklenen biçimde değil.');
      const method = view.getUint16(cursor + 10, true);
      const compressedSize = view.getUint32(cursor + 20, true);
      const nameLen = view.getUint16(cursor + 28, true);
      const extraLen = view.getUint16(cursor + 30, true);
      const commentLen = view.getUint16(cursor + 32, true);
      const localOffset = view.getUint32(cursor + 42, true);
      const name = new TextDecoder().decode(bytes.slice(cursor + 46, cursor + 46 + nameLen));
      if (name === 'word/document.xml') {
        const localNameLen = view.getUint16(localOffset + 26, true);
        const localExtraLen = view.getUint16(localOffset + 28, true);
        const start = localOffset + 30 + localNameLen + localExtraLen;
        const compressed = bytes.slice(start, start + compressedSize);
        if (method === 0) xmlBytes = compressed;
        else if (method === 8) {
          const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
          xmlBytes = new Uint8Array(await new Response(stream).arrayBuffer());
        } else throw new Error('Bu DOCX sıkıştırma biçimi desteklenmiyor.');
        break;
      }
      cursor += 46 + nameLen + extraLen + commentLen;
    }
    if (!xmlBytes) throw new Error('Word belgesinin ana metni bulunamadı.');
    const xml = new DOMParser().parseFromString(new TextDecoder().decode(xmlBytes), 'application/xml');
    if (xml.querySelector('parsererror')) throw new Error('Word belgesinin metni çözümlenemedi.');
    return Array.from(xml.getElementsByTagNameNS('*', 'p'), paragraph =>
      Array.from(paragraph.getElementsByTagNameNS('*', 't'), node => node.textContent || '').join('')
    );
  }

  primaryButton.addEventListener('click', () => {
    if (!selectedFile) return chooseFile();
    const file = selectedFile;
    const tab = window.open('about:blank', '_blank');
    if (!tab) { showFeedback(false); return showMessage('Yeni sekme açılamadı.'); }
    tab.document.title = 'CepDosya · Belge hazırlanıyor';
    tab.document.body.textContent = 'Belgen hazırlanıyor…';
    openFile(file, tab);
  });
  dropzone.addEventListener('click', event => { if (!event.target.closest('button') && !selectedFile) chooseFile(); });
  dropzone.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectedFile ? primaryButton.click() : chooseFile(); } });
  input.addEventListener('change', () => selectFile(input.files[0]));
  for (const eventName of ['dragenter', 'dragover']) dropzone.addEventListener(eventName, event => { event.preventDefault(); dropzone.classList.add('dragging'); });
  for (const eventName of ['dragleave', 'drop']) dropzone.addEventListener(eventName, event => { event.preventDefault(); dropzone.classList.remove('dragging'); });
  dropzone.addEventListener('drop', event => selectFile(event.dataTransfer.files[0]));

  function initAOS() {
    const items = document.querySelectorAll('[data-aos]');
    if (!('IntersectionObserver' in window)) {
      items.forEach(item => item.classList.add('aos-animate'));
      return;
    }
    const activate = entry => {
      const delay = Number(entry.target.dataset.aosDelay || 0);
      entry.target.style.transitionDelay = `${delay}ms`;
      entry.target.classList.toggle('aos-animate', entry.isIntersecting);
    };
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        activate(entry);
      });
    }, { threshold: 0.04, rootMargin: '0px 0px -12px 0px' });
    items.forEach(item => observer.observe(item));
    window.setTimeout(() => {
      items.forEach(item => {
        const rect = item.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          item.style.transitionDelay = `${Number(item.dataset.aosDelay || 0)}ms`;
          item.classList.add('aos-animate');
        }
      });
    }, 120);
  }
  initAOS();

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }
})();
