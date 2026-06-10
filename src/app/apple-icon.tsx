import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
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
            width: 132,
            height: 132,
            borderRadius: 34,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "4px solid rgba(255,255,255,0.16)",
            background: "rgba(15, 23, 42, 0.72)",
          }}
        >
          <div
            style={{
              fontSize: 76,
              lineHeight: 1,
            }}
          >
            🏆
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}