const apiBaseUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export class ApiError extends Error {
  readonly status: number
  readonly data: unknown

  constructor(
    status: number,
    data: unknown,
  ) {
    super(`API request failed with status ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

export async function apiClient<T>(
  path: string,
  options: RequestInit,
): Promise<T> {
  const url = path.startsWith('http')
    ? path
    : `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...options.headers,
    },
  })

  const data = await parseResponse(response)

  if (!response.ok) {
    throw new ApiError(response.status, data)
  }

  return data as T
}

async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) {
    return undefined
  }

  const contentType = response.headers.get('content-type')
  return contentType?.includes('application/json')
    ? response.json()
    : response.text()
}
