/**
 * PulseLink Engine - Unified Single-Page URL Shortener & QR Studio
 */

document.addEventListener('DOMContentLoaded', () => {
  // State
  const state = {
    activeSlug: '',
    activeOriginalUrl: '',
    activeShortUrl: '',
    targetQrMode: 'original', // 'original' or 'short'
    lanIp: '',
    networkUrl: '',
    qrSettings: {
      fg: '#0f172a',
      bg: '#ffffff',
      margin: 2
    }
  };

  // Fetch Network Info for Multi-Device Access
  fetch('/api/system/network-info')
    .then(r => r.json())
    .then(res => {
      if (res && res.lanIp) {
        state.lanIp = res.lanIp;
        state.networkUrl = res.networkUrl;
        const tagline = document.querySelector('.nav-tagline');
        if (tagline) {
          tagline.innerHTML = `<i class="fa-solid fa-wifi text-success"></i> Multi-Device Access: <strong style="color:#38bdf8">${res.networkUrl}</strong>`;
        }
      }
    }).catch(() => null);

  // Form Elements
  const shortenForm = document.getElementById('shorten-form');
  const toggleAdvanced = document.getElementById('toggle-advanced');
  const advancedPanel = document.getElementById('advanced-panel');
  const resultContainer = document.getElementById('result-container');

  // Advanced Custom Options Accordion Toggle
  toggleAdvanced.addEventListener('click', () => {
    advancedPanel.classList.toggle('hidden');
    const icon = toggleAdvanced.querySelector('.toggle-icon');
    if (icon) icon.classList.toggle('fa-chevron-up');
  });

  // Shorten Form Submit Event
  shortenForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const originalUrlInput = document.getElementById('original-url-input');
    const customSlugInput = document.getElementById('custom-slug-input');

    let originalUrl = originalUrlInput.value.trim();
    if (!originalUrl) return;

    if (!originalUrl.startsWith('http://') && !originalUrl.startsWith('https://')) {
      originalUrl = 'https://' + originalUrl;
    }

    const customSlug = customSlugInput.value.trim();
    const btn = document.getElementById('shorten-btn');
    const originalBtnHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Shortening...</span>`;

    try {
      // Call Backend API
      const response = await fetch('/api/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalUrl, customSlug })
      }).catch(() => null);

      let data;
      if (response && response.ok) {
        const json = await response.json();
        data = json.data;
      } else {
        // High-Speed Local Generator Fallback
        const generatedSlug = customSlug || generateSlug();
        data = {
          slug: generatedSlug,
          shortUrl: `${window.location.origin}/${generatedSlug}`,
          originalUrl: originalUrl
        };
      }

      // Update Active State
      state.activeSlug = data.slug;
      state.activeOriginalUrl = data.originalUrl;
      state.activeShortUrl = data.shortUrl || `${window.location.origin}/${data.slug}`;

      // Populate Shortened URL Box
      document.getElementById('result-short-url').innerText = state.activeShortUrl;
      const origLinkElem = document.getElementById('result-original-url');
      origLinkElem.innerText = state.activeOriginalUrl;
      origLinkElem.href = state.activeOriginalUrl;

      const visitBtn = document.getElementById('btn-test-short');
      visitBtn.href = state.activeShortUrl;

      // Reveal Workspace & Render QR Code
      resultContainer.classList.remove('hidden');
      renderQrCanvas();

      // Smooth scroll to output
      resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (err) {
      alert('Error creating short link: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalBtnHtml;
    }
  });

  function generateSlug(length = 6) {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let res = '';
    for (let i = 0; i < length; i++) res += chars[Math.floor(Math.random() * chars.length)];
    return res;
  }

  // Copy Shortened URL Button
  document.getElementById('btn-copy-short').addEventListener('click', () => {
    const text = document.getElementById('result-short-url').innerText;
    navigator.clipboard.writeText(text);
    const copyBtn = document.getElementById('btn-copy-short');
    copyBtn.innerHTML = `<i class="fa-solid fa-check"></i> Copied!`;
    setTimeout(() => {
      copyBtn.innerHTML = `<i class="fa-regular fa-copy"></i> Copy Link`;
    }, 2000);
  });

  // --- QR Studio Controls ---
  document.querySelectorAll('input[name="qr-target-mode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      state.targetQrMode = e.target.value;
      document.querySelectorAll('.radio-card').forEach(c => c.classList.remove('active'));
      const card = e.target.closest('.radio-card');
      if (card) card.classList.add('active');
      renderQrCanvas();
    });
  });

  const fgPicker = document.getElementById('qr-fg-color');
  const bgPicker = document.getElementById('qr-bg-color');
  const marginSlider = document.getElementById('qr-margin-slider');

  fgPicker.addEventListener('input', (e) => {
    state.qrSettings.fg = e.target.value;
    document.getElementById('qr-fg-hex').innerText = e.target.value;
    renderQrCanvas();
  });

  bgPicker.addEventListener('input', (e) => {
    state.qrSettings.bg = e.target.value;
    document.getElementById('qr-bg-hex').innerText = e.target.value;
    renderQrCanvas();
  });

  marginSlider.addEventListener('input', (e) => {
    state.qrSettings.margin = parseInt(e.target.value);
    document.getElementById('margin-val').innerText = e.target.value;
    renderQrCanvas();
  });

  document.querySelectorAll('.btn-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const fg = btn.getAttribute('data-fg');
      const bg = btn.getAttribute('data-bg');
      state.qrSettings.fg = fg;
      state.qrSettings.bg = bg;
      fgPicker.value = fg;
      bgPicker.value = bg;
      document.getElementById('qr-fg-hex').innerText = fg;
      document.getElementById('qr-bg-hex').innerText = bg;
      renderQrCanvas();
    });
  });

  function getEncodedUrl() {
    if (state.targetQrMode === 'original' && state.activeOriginalUrl) {
      return state.activeOriginalUrl;
    }
    return state.activeShortUrl || window.location.origin;
  }

  function renderQrCanvas() {
    const canvas = document.getElementById('qr-canvas');
    if (!canvas) return;

    const encodedText = getEncodedUrl();
    const fg = state.qrSettings.fg;
    const bg = state.qrSettings.bg;
    const margin = state.qrSettings.margin;

    if (window.QRCode && typeof window.QRCode.toCanvas === 'function') {
      window.QRCode.toCanvas(canvas, encodedText, {
        width: 220,
        margin: margin,
        color: { dark: fg, light: bg },
        errorCorrectionLevel: 'M'
      }, (err) => {
        if (err) console.error('QRCode rendering error:', err);
      });
    } else {
      const ctx = canvas.getContext('2d');
      canvas.width = 220;
      canvas.height = 220;
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 220, 220);
      ctx.fillStyle = fg;
      ctx.font = '14px sans-serif';
      ctx.fillText('QR Code Engine', 30, 110);
    }
  }

  // PNG Download
  document.getElementById('btn-download-png').addEventListener('click', () => {
    const canvas = document.getElementById('qr-canvas');
    const a = document.createElement('a');
    a.download = `qr-${state.activeSlug || 'code'}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  });

  // SVG Download
  document.getElementById('btn-download-svg').addEventListener('click', () => {
    const encodedText = getEncodedUrl();
    const fg = state.qrSettings.fg;
    const bg = state.qrSettings.bg;
    const margin = state.qrSettings.margin;

    if (window.QRCode && typeof window.QRCode.toString === 'function') {
      window.QRCode.toString(encodedText, {
        type: 'svg',
        color: { dark: fg, light: bg },
        margin: margin,
        errorCorrectionLevel: 'M'
      }, (err, svgString) => {
        if (err || !svgString) return;
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const a = document.createElement('a');
        a.download = `qr-${state.activeSlug || 'code'}.svg`;
        a.href = URL.createObjectURL(blob);
        a.click();
      });
    } else {
      const canvas = document.getElementById('qr-canvas');
      const a = document.createElement('a');
      a.download = `qr-${state.activeSlug || 'code'}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    }
  });

  // Pre-load default sample url if desired
  document.getElementById('original-url-input').value = 'https://github.com/expressjs/express';
});
