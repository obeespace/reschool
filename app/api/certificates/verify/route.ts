import { NextResponse } from "next/server";
import connectDB from "@/app/utils/db";
import Certificate from "@/app/models/Certificate";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const certificateNumber = searchParams.get("certificateNumber");
    const qrCode = searchParams.get("qrCode");
    if (!certificateNumber && !qrCode) return NextResponse.json({ error: "certificateNumber or qrCode is required" }, { status: 400 });

    await connectDB();
    const filter = certificateNumber ? { certificateNumber } : { qrCode };
    const cert = await Certificate.findOne(filter).lean();

    if (!cert) return NextResponse.json({ valid: false, error: "Certificate not found" }, { status: 404 });
    if (!(cert as {isVerifiable: boolean}).isVerifiable) return NextResponse.json({ valid: false, error: "Certificate is not verifiable" }, { status: 403 });

    return NextResponse.json({ valid: true, certificate: cert });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Verification failed" }, { status: 500 });
  }
}
