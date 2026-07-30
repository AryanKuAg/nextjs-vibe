import { NextResponse } from "next/server";
import { inngest } from "@/inngest/client";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { projectId, action, payload } = await req.json();

    if (!projectId || !action) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    await inngest.send({
      name: "project.user.response",
      data: {
        projectId,
        action,
        payload
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[USER_RESPONSE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
