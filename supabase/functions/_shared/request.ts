// Read only the allowed number of bytes, even when Content-Length is absent.
export async function readSubmission(
  request: Request,
  limit: number,
): Promise<{ body: Record<string, unknown> } | { status: 400 | 413 | 415 }> {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return { status: 415 };
  }
  if (Number(request.headers.get('content-length')) > limit) return { status: 413 };
  const reader = request.body?.getReader();
  if (!reader) return { status: 400 };
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    let raw = '';
    let bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > limit) return { status: 413 };
      raw += decoder.decode(value, { stream: true });
    }
    const body = JSON.parse(raw + decoder.decode());
    if (!body || typeof body !== 'object' || Array.isArray(body)) return { status: 400 };
    return { body };
  } catch {
    return { status: 400 };
  } finally {
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export const submissionErrors = {
  400: 'Invalid submission.',
  413: 'Request too large.',
  415: 'Content-Type must be application/json.',
};
