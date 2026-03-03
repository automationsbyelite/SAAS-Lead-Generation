import { NextRequest, NextResponse } from "next/server";

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
        },
    },
};

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        // Validate size (e.g. max 10MB to avoid overwhelming the DB and request limits)
        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json({ error: "File too large. Maximum size is 10MB for database storage." }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Convert the file to a Data URL (base64 string)
        const base64Data = buffer.toString('base64');
        const mimeType = file.type;
        const dataUrl = `data:${mimeType};base64,${base64Data}`;

        return NextResponse.json({
            success: true,
            url: dataUrl,
            message: "File processed and converted to Base64 successfully",
        });
    } catch (error: any) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
