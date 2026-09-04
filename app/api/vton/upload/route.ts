import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/server";
import { v4 as uuidv4 } from "uuid";
import { authenticate, unauthorized } from "@/lib/supabase/route";

export async function POST(req: NextRequest) {
  try {
    // Bearer 토큰 검증 — 브라우저는 authFetch() 로 access token 을 실어 보낸다.
    const auth = await authenticate(req);
    if (!auth) return unauthorized();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const bucket = (formData.get("bucket") as string) || "vton-assets";
    const folder = (formData.get("folder") as string) || "uploads";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const supabase = getAdminSupabase();

    // 1. 버킷 확인 및 없으면 생성 시도
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === bucket);
    if (!exists) {
      await supabase.storage.createBucket(bucket, { public: true });
    }

    // 2. 고유 파일명 생성
    const fileExt = file.name.split(".").pop() || "png";
    const fileName = `${folder}/${Date.now()}-${uuidv4()}.${fileExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. 파일 업로드
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType: file.type || "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase Storage upload error:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // 4. Public URL 획득
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: fileName,
    });
  } catch (error: any) {
    console.error("Upload API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload image" },
      { status: 500 }
    );
  }
}
