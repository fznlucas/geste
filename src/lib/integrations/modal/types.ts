/** What the app needs from the GPU provider: start a generation job. Progress and candidates come back by webhook. */
export interface ModalAdapter {
  submitJob(input: { number: number; candidates: number; format: string; maxStrokes: number; layers: number }): Promise<{ callId: string }>;
}
