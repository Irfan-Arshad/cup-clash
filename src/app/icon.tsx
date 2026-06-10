import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 30% 20%, #10b981 0, transparent 34%), linear-gradient(135deg, #020617 0%, #0f172a 55%, #022c22 100%)",
        }}
      >
        <div
          style={{
            width: 390,
            height: 390,
            borderRadius: 92,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "8px solid rgba(255,255,255,0.16)",
            background: "rgba(15, 23, 42, 0.72)",
            boxShadow: "0 40px 120px rgba(0,0,0,0.45)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                fontSize: 138,
                lineHeight: 1,
              }}
            >
              🏆
            </div>

            <div
              style={{
                fontSize: 72,
                fontWeight: 900,
                letterSpacing: -3,
                color: "white",
              }}
            >
              CC
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}