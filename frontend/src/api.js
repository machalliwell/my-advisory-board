const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Stats
  getStats: () => request('/stats'),

  // Advisors
  getAdvisors: () => request('/advisors'),
  createAdvisor: (name, description = '') =>
    request('/advisors', { method: 'POST', body: JSON.stringify({ name, description }) }),
  deleteAdvisor: (name) =>
    request(`/advisors/${encodeURIComponent(name)}`, { method: 'DELETE' }),

  // Ask
  ask: (question, advisorName = null, limit = 10) =>
    request('/ask', {
      method: 'POST',
      body: JSON.stringify({ question, advisor_name: advisorName, limit }),
    }),

  // LinkedIn
  linkedin: (topic, advisorName = null, limit = 15) =>
    request('/linkedin', {
      method: 'POST',
      body: JSON.stringify({ topic, advisor_name: advisorName, limit }),
    }),

  // Ingest
  ingestURL: (url, advisorName, title = null) =>
    request('/ingest/url', {
      method: 'POST',
      body: JSON.stringify({ url, advisor_name: advisorName, title }),
    }),

  ingestFile: async (file, advisorName, title = null) => {
    const formData = new FormData();
    formData.append('file', file);
    const params = new URLSearchParams({ advisor_name: advisorName });
    if (title) params.append('title', title);
    const res = await fetch(`${BASE}/ingest/file?${params}`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `Upload failed: ${res.status}`);
    }
    return res.json();
  },

  // Topics
  getTopics: () => request('/topics'),

  // Sources
  getSources: (advisorName = null) => {
    const params = advisorName ? `?advisor_name=${encodeURIComponent(advisorName)}` : '';
    return request(`/sources${params}`);
  },
};
