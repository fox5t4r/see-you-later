export interface TranscribeResponse {
  transcript: string;
  duration_seconds: number;
  language: string;
}

export async function transcribeVideo(
  videoId: string,
  backendUrl: string
): Promise<TranscribeResponse> {
  const response = await fetch(`${backendUrl}/api/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ video_id: videoId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: '알 수 없는 오류' }));
    throw new Error(
      `Whisper 변환 오류 (${response.status}): ${(error as { detail?: string }).detail ?? '요청 실패'}`
    );
  }

  return response.json() as Promise<TranscribeResponse>;
}
