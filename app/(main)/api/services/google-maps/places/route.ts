import { NextResponse } from "next/server";

export async function GET() {
  const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

  if (!GOOGLE_MAPS_API_KEY) {
    return NextResponse.json({ error: "API key is missing" }, { status: 500 });
  }

  const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;

  return NextResponse.json({ scriptUrl });
}
