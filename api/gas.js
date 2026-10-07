/**
 * Vercel Serverless Function Proxy for Google Apps Script Web App
 * Bypasses browser CORS restrictions by forwarding requests server-to-server.
 */

module.exports = async (req, res) => {
  // Set CORS headers so any client or origin can communicate smoothly
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Target-GAS-URL'
  );

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Determine target Google Apps Script URL
  let targetUrl = req.headers['x-target-gas-url'] ||
                  req.query.gasUrl ||
                  process.env.APPS_SCRIPT_URL ||
                  'https://script.google.com/macros/s/AKfycbxyA9q8promp9_rmxyI_pkx4UwEBLBITjoP4eeKxvHbrd4QJ83MDEsG73SmwQkTlwfy/exec';

  // Normalize Google Workspace domain prefix if present (/a/domain/s/ -> /macros/s/)
  if (targetUrl && typeof targetUrl === 'string') {
    targetUrl = targetUrl.replace(/\/a\/[^\/]+\/s\//, '/macros/s/');
  }

  try {
    let payload;
    if (req.method === 'GET') {
      const urlObj = new URL(targetUrl);
      Object.keys(req.query || {}).forEach(k => {
        if (k !== 'gasUrl') urlObj.searchParams.set(k, req.query[k]);
      });
      targetUrl = urlObj.toString();
    } else {
      payload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    }

    const response = await fetch(targetUrl, {
      method: req.method === 'GET' ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: req.method === 'GET' ? undefined : payload,
      redirect: 'follow'
    });

    const text = await response.text();
    try {
      const json = JSON.parse(text);
      return res.status(200).json(json);
    } catch {
      return res.status(200).send(text);
    }
  } catch (error) {
    return res.status(200).json({
      success: false,
      message: 'Proxy connection notice: ' + (error ? error.message : 'Unknown network issue'),
      isFallback: true
    });
  }
};
