(() => {
  const input = document.querySelector('#fileInput');
  const dropzone = document.querySelector('#dropzone');
  const message = document.querySelector('#message');
  const primaryButton = document.querySelector('#chooseFile');
  const selectedInfo = document.querySelector('#selectedInfo');
  const dropTitle = dropzone.querySelector('h2');
  const dropHint = dropzone.querySelector('.drop-inner p');
  const uploadFeedback = document.querySelector('#uploadFeedback');
  let selectedFile = null;
  let feedbackTimers = [];
  const maxBytes = 50 * 1024 * 1024;
  const excelExtensions = new Set(['xls', 'xlsx', 'xlsm', 'xlsb', 'csv']);
  function isSupportedFile(file) {
    const ext = extensionOf(file);
    return ext === 'pdf' || excelExtensions.has(ext);
  }

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
    dropTitle.textContent = 'Belgenizi Buraya Bırakın';
    dropHint.hidden = false;
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
    if (!isSupportedFile(file)) {
      showFeedback(false);
      return showMessage('Bu dosya türü desteklenmiyor. Yalnızca PDF ve Excel dosyaları seçebilirsiniz.');
    }
    if (file.size > maxBytes) { showFeedback(false); return showMessage('Dosya boyutu 50 MB sınırını aşıyor.'); }
    selectedFile = file;
    dropTitle.textContent = 'Dosyanız Hazır';
    dropHint.hidden = true;
    selectedInfo.textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`;
    primaryButton.textContent = extensionOf(file) === 'pdf' ? 'PDF’yi yeni sekmede aç →' : 'Excel dosyasını yeni sekmede aç →';
    showFeedback(true);
    showMessage('');
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
      } else if (excelExtensions.has(ext)) {
        url = URL.createObjectURL(file);
      } else {
        throw new Error('Yalnızca PDF ve Excel dosyaları açılabilir.');
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
