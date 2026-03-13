import { NextResponse } from "next/server";

function d1OnlyResponse() {
  return NextResponse.json(
    {
      error: "This endpoint is temporarily unavailable while migrating fully to D1.",
      code: "D1_MIGRATION_PENDING",
    },
    { status: 501 }
  );
}

export async function GET() {
  return d1OnlyResponse();
}

export async function POST() {
  return d1OnlyResponse();
}

export async function PUT() {
  return d1OnlyResponse();
}

export async function PATCH() {
  return d1OnlyResponse();
}

export async function DELETE() {
  return d1OnlyResponse();
}