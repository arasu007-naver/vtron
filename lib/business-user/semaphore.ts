/**
 * 프로세스 안 동시 실행 상한 — 기다리지 않는다. 자리가 없으면 tryAcquire() 가 null 을 돌려주고,
 * 라우트는 곧바로 429 + Retry-After 로 답한다(POST /api/v1/style-id).
 *
 *   const release = sem.tryAcquire();
 *   if (!release) return 429;
 *   try { … } finally { release(); }
 *
 * release 는 여러 번 불러도 한 번만 반영된다. 외부 의존 없음(lib/business-user/tests/job-retry.test.mjs).
 */
export interface Semaphore {
  readonly limit: number;
  readonly inUse: number;
  tryAcquire(): (() => void) | null;
}

export function createSemaphore(limit: number): Semaphore {
  const max = Math.max(1, Math.floor(limit));
  let inUse = 0;
  return {
    limit: max,
    get inUse() {
      return inUse;
    },
    tryAcquire() {
      if (inUse >= max) return null;
      inUse++;
      let released = false;
      return () => {
        if (released) return;
        released = true;
        inUse--;
      };
    },
  };
}

/** 양의 정수 env, 없거나 틀리면 fallback */
export function envInt(name: string, fallback: number): number {
  const n = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
