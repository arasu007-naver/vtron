export type BgFitType = 'Cover' | 'Contain' | '반복';
export type BgModeType = 'css' | 'image' | 'solid';

export interface GarmentItem {
  id: string;
  name: string;
  slot: string; // '상의', '하의', '아웃터', '신발', '시계', '목걸이', '팔찌', '반지', '발찌', '안경', '가방', '모자'
  layer: number;
  fit: number; // 0 ~ 100%
  imageUrl?: string;
  file?: File | null;
}

export interface BackgroundSetting {
  mode: BgModeType;
  cssBg: string | null; // e.g. '보케', '선셋 글로우', etc.
  bgFit: BgFitType;
  customImageUrl?: string | null;
}

export interface CharacterSetting {
  imageUrl?: string | null;
  scale: number; // 40 ~ 140%
  autoRemoveBg: boolean;
  preserveFaceHands: boolean;
}

export interface LogEntry {
  id?: string;
  time: string;
  level: 'info' | 'warn' | 'error';
  text: string;
}

export interface CanvasPreset {
  label: string;
  w: number;
  h: number;
  ratioLabel: string;
}

export interface VtonProject {
  id: string;
  user_id?: string | null;
  title: string;
  width: number;
  height: number;
  size_label: string;
  bg_type: BgModeType;
  bg_value?: string | null;
  bg_fit: BgFitType;
  character_image_url?: string | null;
  character_scale: number;
  auto_remove_bg: boolean;
  preserve_face_hands: boolean;
  seed: number;
  status: string;
  created_at?: string;
  updated_at?: string;
  garments?: GarmentItem[];
}

export interface VtonRenderJob {
  id: string;
  project_id: string;
  user_id?: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  seed: number;
  result_image_url?: string | null;
  logs: LogEntry[];
  error_message?: string | null;
  created_at?: string;
  completed_at?: string | null;
}
