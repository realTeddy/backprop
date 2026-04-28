import { ImageResponse } from "next/og";

const FONT_SCALE = 240 / 512;

export function createAppIcon(size: number) {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#ffffff",
          fontSize: Math.round(size * FONT_SCALE),
          fontWeight: 700,
          fontFamily: "system-ui, sans-serif",
          letterSpacing: "-0.08em",
        }}
      >
        B
      </div>
    ),
    {
      width: size,
      height: size,
    },
  );
}
