import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = getAdminSupabase();
    const { data: projects, error } = await supabase
      .from("vton_projects")
      .select("*, garments:vton_garments(*)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch projects error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ projects: projects || [] });
  } catch (err: any) {
    console.error("Projects API error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      width,
      height,
      size_label,
      bg_type,
      bg_value,
      bg_fit,
      character_image_url,
      character_scale,
      auto_remove_bg,
      preserve_face_hands,
      seed,
      garments,
    } = body;

    const supabase = getAdminSupabase();

    // 1. Insert or update project
    const { data: project, error: projError } = await supabase
      .from("vton_projects")
      .insert({
        title: title || "Untitled VTON Session",
        width: width || 1080,
        height: height || 1350,
        size_label: size_label || "1080 × 1350",
        bg_type: bg_type || "css",
        bg_value: bg_value || "보케",
        bg_fit: bg_fit || "Cover",
        character_image_url: character_image_url || null,
        character_scale: character_scale ?? 100,
        auto_remove_bg: auto_remove_bg ?? true,
        preserve_face_hands: preserve_face_hands ?? true,
        seed: seed || 4821,
      })
      .select()
      .single();

    if (projError) {
      console.error("Project insert error:", projError);
      return NextResponse.json({ error: projError.message }, { status: 500 });
    }

    // 2. Insert garments if present
    if (garments && garments.length > 0) {
      const garmentsToInsert = garments.map((g: any, i: number) => ({
        project_id: project.id,
        slot: g.slot,
        name: g.name,
        layer: i + 1,
        fit: g.fit,
        image_url: g.imageUrl || null,
      }));

      const { error: garmentError } = await supabase
        .from("vton_garments")
        .insert(garmentsToInsert);

      if (garmentError) {
        console.error("Garment insert error:", garmentError);
      }
    }

    return NextResponse.json({ success: true, project });
  } catch (err: any) {
    console.error("Save project error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to save project" },
      { status: 500 }
    );
  }
}
