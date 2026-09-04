"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * 하이드레이션이 끝난 뒤(=브라우저에서 실행 중일 때) true 를 돌려준다.
 *
 * localStorage 접근이나 랜덤 값 생성처럼 서버/클라이언트 결과가 달라지는 작업을
 * 이펙트 안에서 setState 로 반영하면 연쇄 렌더가 발생한다. 대신 이 훅으로
 * 클라이언트 여부를 구독하면 하이드레이션 불일치 없이 파생값을 계산할 수 있다.
 */
export function useIsClient() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}
