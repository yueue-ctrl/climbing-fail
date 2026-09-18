import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

export async function POST(request: Request) {
  const body = await request.json() as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!/^uploads\/[a-f0-9-]{36}\.gif$/i.test(pathname)) throw new Error("INVALID UPLOAD PATH");
        return {
          allowedContentTypes: ["image/gif"],
          maximumSizeInBytes: 6 * 1024 * 1024,
          addRandomSuffix: false,
        };
      },
      onUploadCompleted: async () => undefined,
    });
    return Response.json(result);
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "UPLOAD FAILED", { status: 400 });
  }
}
