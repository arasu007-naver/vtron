import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/server";
import {
  FashnConfigError,
  runTryOn,
  slotToCategory,
  type FashnMode,
} from "@/lib/fashn/tryon";
import type { LogEntry } from "@/types/vton";
import { authenticate, unauthorized } from "@/lib/supabase/route";

// 가먼트를 순차로 입히며 폴링하므로 시간이 오래 걸릴 수 있다.
export const runtime = "nodejs";
export const maxDuration = 300;

const RESULTS_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_RESULTS_BUCKET || "vton-results";

const FALLBACK_RESULT_URL =
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=1080&q=85";

interface IncomingGarment {
  id?: string;
  name?: string;
  slot: string;
  layer?: number;
  fit?: number;
  imageUrl?: string | null;
}

/** 렌더 시작 시각 기준의 경과 시간을 mm:ss.cc 로 포맷한다. */
const stamp = (startedAt: number) => {
  const elapsed = Date.now() - startedAt;
  const m = String(Math.floor(elapsed / 60000)).padStart(2, "0");
  const s = String(Math.floor((elapsed % 60000) / 1000)).padStart(2, "0");
  const cs = String(Math.floor((elapsed % 1000) / 10)).padStart(2, "0");
  return `${m}:${s}.${cs}`;
};

/**
 * FASHN CDN 결과는 일정 시간이 지나면 만료되므로 Supabase Storage 로 복사한다.
 * 실패하면 원본 CDN URL 을 그대로 사용한다.
 */
async function persistResult(
  supabase: ReturnType<typeof getAdminSupabase>,
  imageUrl: string
): Promise<string> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`결과 이미지 다운로드 실패 (${res.status})`);

    const contentType = res.headers.get("content-type") || "image/png";
    const ext = contentType.includes("jpeg") ? "jpg" : "png";
    const buffer = Buffer.from(await res.arrayBuffer());

    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.some((b) => b.name === RESULTS_BUCKET)) {
      await supabase.storage.createBucket(RESULTS_BUCKET, { public: true });
    }

    const path = `renders/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;

    const { error } = await supabase.storage
      .from(RESULTS_BUCKET)
      .upload(path, buffer, { contentType, upsert: true });
    if (error) throw error;

    const {
      data: { publicUrl },
    } = supabase.storage.from(RESULTS_BUCKET).getPublicUrl(path);
    return publicUrl;
  } catch (err) {
    console.error("Result persist error:", err);
    return imageUrl;
  }
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const logs: LogEntry[] = [];
  const log = (level: LogEntry["level"], text: string) =>
    logs.push({ time: stamp(startedAt), level, text });

  const supabase = getAdminSupabase();
  let jobId: string | undefined;

  // Bearer 토큰 검증 — 인증 없이 FASHN 크레딧을 쓰지 못하게 한다.
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  try {
    const body = await req.json();
    const {
      projectId,
      size,
      seed,
      characterUrl,
      garments,
      mode,
      segmentationFree,
      modelName,
    } = body as {
      projectId?: string;
      size?: string;
      seed?: number;
      characterUrl?: string | null;
      garments?: IncomingGarment[];
      mode?: FashnMode;
      segmentationFree?: boolean;
      modelName?: string;
    };

    const renderSeed = seed || 4821;

    log("info", `착장 렌더 큐 시작 (${size || "기본 크기"} · seed ${renderSeed}).`);

    // 1. 렌더 잡 생성
    const { data: job, error: jobError } = await supabase
      .from("vton_render_jobs")
      .insert({
        project_id: projectId || null,
        status: "processing",
        progress: 10,
        seed: renderSeed,
        logs,
      })
      .select()
      .single();

    if (jobError) {
      console.error("Job creation error:", jobError);
    }
    jobId = job?.id;

    // 2. 입력 검증 — try-on 이 가능한 조건인지 확인
    const wearable = (garments || [])
      .filter((g) => g.imageUrl)
      .map((g) => ({ ...g, category: slotToCategory(g.slot) }))
      .sort((a, b) => (a.layer ?? 0) - (b.layer ?? 0));

    const skipped = wearable.filter((g) => g.category === null);
    const supported = wearable.filter((g) => g.category !== null);

    const missingImages = (garments || []).filter((g) => !g.imageUrl);
    if (missingImages.length) {
      log(
        "warn",
        `이미지가 없는 가먼트 ${missingImages.length}건은 건너뜁니다: ${missingImages
          .map((g) => g.name || g.slot)
          .join(", ")}`
      );
    }
    if (skipped.length) {
      log(
        "warn",
        `try-on 모델이 지원하지 않는 슬롯은 제외했습니다: ${skipped
          .map((g) => g.slot)
          .join(", ")}`
      );
    }

    const hasApiKey = Boolean(process.env.FASHN_API_KEY);

    // 3. 실제 인퍼런스가 불가능하면 기존 데모 동작으로 폴백
    if (!hasApiKey || !characterUrl || supported.length === 0) {
      if (!hasApiKey) {
        log("warn", "FASHN_API_KEY 가 없어 데모 결과로 대체합니다.");
      } else if (!characterUrl) {
        log("warn", "캐릭터 이미지가 없어 데모 결과로 대체합니다.");
      } else {
        log(
          "warn",
          "입힐 수 있는 가먼트 이미지가 없어 데모 결과로 대체합니다."
        );
      }

      const resultImageUrl = characterUrl || FALLBACK_RESULT_URL;
      log("info", "미리보기 렌더를 캔버스에 표시합니다.");

      if (jobId) {
        await supabase
          .from("vton_render_jobs")
          .update({
            status: "completed",
            progress: 100,
            result_image_url: resultImageUrl,
            logs,
            completed_at: new Date().toISOString(),
          })
          .eq("id", jobId);
      }

      return NextResponse.json({
        success: true,
        simulated: true,
        jobId,
        progress: 100,
        resultImageUrl,
        logs,
      });
    }

    // 4. 레이어 순서대로 가먼트를 한 벌씩 입힌다.
    //    직전 단계의 결과 이미지가 다음 단계의 모델 이미지가 된다.
    log(
      "info",
      `FASHN try-on 시작 — 가먼트 ${supported.length}건을 레이어 순서로 합성합니다.`
    );

    let currentImage = characterUrl;
    const intermediates: string[] = [];

    for (let i = 0; i < supported.length; i++) {
      const g = supported[i];
      const label = g.name || g.slot;
      log("info", `[${i + 1}/${supported.length}] «${label}» 워핑 중 (${g.category}).`);

      const output = await runTryOn({
        modelImage: currentImage,
        garmentImage: g.imageUrl as string,
        category: g.category ?? "auto",
        mode: mode || "balanced",
        segmentationFree: segmentationFree ?? true,
        seed: renderSeed,
        numSamples: 1,
        modelName: modelName || "tryon-v1.6",
      });

      currentImage = output[0];
      intermediates.push(currentImage);
      log("info", `[${i + 1}/${supported.length}] «${label}» 착장 완료.`);

      if (jobId) {
        await supabase
          .from("vton_render_jobs")
          .update({
            progress: Math.round(((i + 1) / supported.length) * 90),
            logs,
          })
          .eq("id", jobId);
      }
    }

    // 5. 최종 결과를 Supabase Storage 에 보관
    const resultImageUrl = await persistResult(supabase, currentImage);
    log("info", `착장 생성 완료 · 결과 이미지를 저장했습니다.`);

    if (jobId) {
      await supabase
        .from("vton_render_jobs")
        .update({
          status: "completed",
          progress: 100,
          result_image_url: resultImageUrl,
          logs,
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);
    }

    return NextResponse.json({
      success: true,
      simulated: false,
      jobId,
      progress: 100,
      resultImageUrl,
      intermediates,
      logs,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to process VTON render";
    console.error("Render API error:", err);
    log("error", message);

    if (jobId) {
      await supabase
        .from("vton_render_jobs")
        .update({
          status: "failed",
          logs,
          error_message: message,
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);
    }

    return NextResponse.json(
      {
        error: message,
        requiresApiKey: err instanceof FashnConfigError,
        logs,
      },
      { status: err instanceof FashnConfigError ? 401 : 500 }
    );
  }
}
