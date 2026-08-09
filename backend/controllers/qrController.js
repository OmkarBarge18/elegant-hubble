/**
 * QR Code Controller Module
 * Generates vector SVG and raster PNG QR codes for shortened link sharing.
 */

const QRCode = require('qrcode');

/**
 * GET /api/qr/:slug
 * Query params: ?color=#000000&bg=#ffffff&type=svg|png
 */
async function generateQrCode(req, res) {
  const { slug } = req.params;
  const { color = '#0f172a', bg = '#ffffff', format = 'png', margin = 2 } = req.query;

  const protocol = req.protocol || 'http';
  const host = req.get('host') || 'localhost:3000';
  const targetUrl = `${protocol}://${host}/${slug}`;

  try {
    const qrOptions = {
      errorCorrectionLevel: 'H',
      type: format === 'svg' ? 'svg' : 'image/png',
      quality: 0.95,
      margin: parseInt(margin) || 2,
      color: {
        dark: color,
        light: bg
      }
    };

    if (format === 'svg') {
      const svgString = await QRCode.toString(targetUrl, { ...qrOptions, type: 'svg' });
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.send(svgString);
    } else {
      // Buffer / Data URL PNG
      const pngBuffer = await QRCode.toBuffer(targetUrl, { ...qrOptions, width: 400 });
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.send(pngBuffer);
    }
  } catch (error) {
    console.error(`QR generation error for slug /${slug}:`, error);
    return res.status(500).json({ error: 'QR Code Generation Failed', message: error.message });
  }
}

module.exports = {
  generateQrCode
};
