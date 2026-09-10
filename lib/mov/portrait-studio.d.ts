/**
 * Portrait Studio 를 마운트한다.
 *
 * @param root 스튜디오 마크업(.mov-app)을 담고 있는 엘리먼트. 모든 엘리먼트 조회가
 *             이 안으로 한정되고, --stage-w / --stage-h 도 여기에 심어진다.
 * @returns 언마운트용 정리 함수 — rAF 루프·자동저장 타이머·beforeunload 를 걷어낸다.
 */
export function initPortraitStudio(root: HTMLElement): () => void;
