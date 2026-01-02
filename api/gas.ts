import type { VercelRequest, VercelResponse } from '@vercel/node';

// Google Apps Script endpoint
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxqx00B7oSgwGlyCgUb1ONM-lBc-xuQUb1ykUIfY_rdZIK8l1xDN_AnSA66gONNBSdH/exec';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    // Preserve all query parameters
    const query = req.url?.split('?')[1] || '';
    const target = query ? `${GAS_URL}?${query}` : GAS_URL;

    const response = await fetch(target, {
      method: 'GET',
      // Forward minimal headers if needed
      headers: {
        'Accept': 'application/json',
      },
    });

    // If GAS returns non-200, forward status
    if (!response.ok) {
      const text = await response.text();
      res.status(response.status).send(text);
      return;
    }

    // Try JSON first, fallback to text
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      res.setHeader('Content-Type', 'application/json');
      res.status(200).json(data);
    } else {
      const text = await response.text();
      res.setHeader('Content-Type', contentType || 'text/plain');
      res.status(200).send(text);
    }
  } catch (err: any) {
    res.status(502).json({ error: 'Upstream fetch failed', message: err?.message || String(err) });
  }
}
