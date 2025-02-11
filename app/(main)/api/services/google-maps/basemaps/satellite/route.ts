import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return NextResponse.json({ error: "Unauthenticated!" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const x = searchParams.get("x");
  const y = searchParams.get("y");
  const z = searchParams.get("z");
  const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

  if (!GOOGLE_MAPS_API_KEY) {
    return NextResponse.json(
      { error: "API key is not configured" },
      { status: 500 }
    );
  }

  if (!x || !y || !z) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const tileUrl = `https://maps.googleapis.com/maps/vt?lyrs=s&x=${x}&y=${y}&z=${z}&key=${GOOGLE_MAPS_API_KEY}`;
  return NextResponse.redirect(tileUrl);
}
