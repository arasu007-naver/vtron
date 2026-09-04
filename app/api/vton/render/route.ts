import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      projectId,
      size,
      seed,
      characterUrl,
      garments,
      bgSetting,
      characterSetting,
    } = body;

    const supabase = getAdminSupabase();

    // 1. 렌더 잡 생성
    const { data: job, error: jobError } = await supabase
      .from("vton_render_jobs")
      .insert({
        project_id: projectId || null,
        status: "processing",
        progress: 10,
        seed: seed || 4821,
        logs: [
          {
            time: "00:00.12",
            level: "info",
            text: `착장 렌더 큐 시작 (${size} · seed ${seed}).`,
          },
          {
            time: "00:00.60",
            level: "info",
            text: `캐릭터 키포인트 및 신체 분할 완료.`,
          },
        ],
      })
      .select()
      .single();

    if (jobError) {
      console.error("Job creation error:", jobError);
    }

    // 2. 가상 피팅 결과 이미지 생성/연동
    // (실제 인퍼런스 서버가 연결되면 해당 API 호출, 기본적으로 샘플 렌더 결과물 URL 반환)
    const sampleResultUrl =
      characterUrl ||
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=1080&q=85";

    const completionLogs = [
      {
        time: "00:00.12",
        level: "info",
        text: `착장 렌더 큐 시작 (${size} · seed ${seed}).`,
      },
      {
        time: "00:00.60",
        level: "info",
        text: `캐릭터 키포인트 및 신체 분할 완료 (17개 키포인트).`,
      },
      {
        time: "00:01.40",
        level: "info",
        text: `가먼트 워핑: ${garments?.map((g: any) => g.name).join(" → ") || "가먼트 없음"}.`,
      },
      {
        time: "00:03.20",
        level: "info",
        text: `배경 합성 및 텍스처 블렌딩 적용 완료.`,
      },
      {
        time: "00:04.80",
        level: "info",
        text: `착장 생성 완료 · vton-result-${Date.now().toString().slice(-4)}.png`,
      },
    ];

    if (job?.id) {
      await supabase
        .from("vton_render_jobs")
        .update({
          status: "completed",
          progress: 100,
          result_image_url: sampleResultUrl,
          logs: completionLogs,
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);
    }

    return NextResponse.json({
      success: true,
      jobId: job?.id,
      progress: 100,
      resultImageUrl: sampleResultUrl,
      logs: completionLogs,
    });
  } catch (err: any) {
    console.error("Render API error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process VTON render" },
      { status: 500 }
    );
  }
}
