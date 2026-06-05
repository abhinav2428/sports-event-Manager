import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export const api = axios.create({ baseURL: `${BASE}/api/v1` })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})
api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) {
    localStorage.clear(); window.location.href = '/login'
  }
  return Promise.reject(err)
})

export const authApi = {
  login:    (username: string, password: string) => api.post('/auth/login', { username, password }),
  register: (d: object) => api.post('/auth/register', d),
  users:    () => api.get('/auth/users'),
}

export const swimmersApi = {
  list:   () => api.get('/swimmers'),
  create: (d: object) => api.post('/swimmers', d),
  get:    (id: string) => api.get(`/swimmers/${id}`),
  delete: (id: string) => api.delete(`/swimmers/${id}`),
}

export const teamsApi = {
  list:      () => api.get('/teams'),
  create:    (d: object) => api.post('/teams', d),
  get:       (id: string) => api.get(`/teams/${id}`),
  addMember: (teamId: string, swimmerId: string, role = 'member') =>
    api.post(`/teams/${teamId}/members`, { swimmer_id: swimmerId, role }),
}

export const meetsApi = {
  list:         () => api.get('/meets'),
  create:       (d: object) => api.post('/meets', d),
  get:          (id: string) => api.get(`/meets/${id}`),
  updateStatus: (id: string, s: string) => api.patch(`/meets/${id}/status?new_status=${s}`),
}

export const eventsApi = {
  list:   (meetId: string) => api.get(`/meets/${meetId}/events`),
  create: (meetId: string, d: object) => api.post(`/meets/${meetId}/events`, d),
  get:    (meetId: string, evId: string) => api.get(`/meets/${meetId}/events/${evId}`),
  getMy:  (evId: string) => api.get(`/events/${evId}/detail`),
}

export const entriesApi = {
  listIndividual: (evId: string) => api.get(`/events/${evId}/individual-entries`),
  addIndividual:  (evId: string, d: object) => api.post(`/events/${evId}/individual-entries`, d),
  listRelay:      (evId: string) => api.get(`/events/${evId}/relay-entries`),
  addRelay:       (evId: string, d: object) => api.post(`/events/${evId}/relay-entries`, d),
  updateRelayLeg: (entryId: string, d: object) =>
    api.patch(`/events/relay-entries/${entryId}/legs`, d),
}

export const heatApi = {
  seed: (evId: string, lanes = 8) => api.post(`/events/${evId}/seed?pool_lanes=${lanes}`),
  list: (evId: string) => api.get(`/events/${evId}/heats`),
}

export const resultsApi = {
  forEvent:       (evId: string) => api.get(`/results/event/${evId}`),
  record:         (d: object) => api.post('/results', d),
  edit:           (id: string, d: object) => api.patch(`/results/${id}/edit`, d),
  save:           (id: string) => api.patch(`/results/${id}/save`),
  finalize:       (id: string) => api.patch(`/results/${id}/finalize`),
  dqCodes:        () => api.get('/results/dq-codes'),
  certificateData:(id: string) => api.get(`/results/${id}/certificate-data`),
}

export const assignmentsApi = {
  assign:   (evId: string, recId: string) =>
    api.post('/assignments', { event_id: evId, recorder_id: recId }),
  remove:   (assignmentId: string) => api.delete(`/assignments/${assignmentId}`),
  forEvent: (evId: string) => api.get(`/assignments/event/${evId}`),
  my:       () => api.get('/assignments/my'),
}

export const awardsApi = {
  list:   (meetId: string) => api.get(`/meets/${meetId}/awards`),
  create: (meetId: string, d: object) => api.post(`/meets/${meetId}/awards`, d),
}

export const reportsApi = {
  heatSheet: (meetId: string) =>
    api.post(`/meets/${meetId}/reports/heat-sheet`, {}, { responseType: 'blob' }),
  results:   (meetId: string) =>
    api.post(`/meets/${meetId}/reports/results`, {}, { responseType: 'blob' }),
}

export const excelApi = {
  swimmers: {
    template: () => api.get('/swimmers/excel/template', { responseType: 'blob' }),
    import:   (file: File) => {
      const form = new FormData(); form.append('file', file)
      return api.post('/swimmers/excel/import', form, { headers: { 'Content-Type': 'multipart/form-data' } })
    },
    export: () => api.get('/swimmers/excel/export', { responseType: 'blob' }),
  },
  teams: {
    template: () => api.get('/teams/excel/template', { responseType: 'blob' }),
    import:   (file: File) => {
      const form = new FormData(); form.append('file', file)
      return api.post('/teams/excel/import', form, { headers: { 'Content-Type': 'multipart/form-data' } })
    },
    export: () => api.get('/teams/excel/export', { responseType: 'blob' }),
  },
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}
