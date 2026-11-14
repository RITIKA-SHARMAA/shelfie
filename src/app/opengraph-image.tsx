import { ImageResponse } from "next/og";

export const alt = "Shelfie: a quiet reading shelf";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const SPINES = [
  ["#c7a27c", 150, 40],
  ["#3f3a35", 172, 46],
  ["#8c9a86", 140, 32],
  ["#e9dccb", 166, 40],
  ["#dfe3d6", 152, 34],
  ["#efe7da", 140, 30],
  ["#9c6b4e", 134, 28],
  ["#5f6b56", 156, 34],
  ["#2f2c28", 162, 36],
  ["#7a4a35", 146, 30],
] as const;

/** Link preview card for WhatsApp, LinkedIn, Slack and friends. */
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#f2ede4",
        color: "#2b2620",
        padding: "70px 80px",
        fontFamily: "serif",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 36 }}>shelfie</div>
        <div style={{ fontSize: 76, marginTop: 30, lineHeight: 1.05 }}>Every book, one quiet shelf.</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, paddingLeft: 40 }}>
          {SPINES.map(([c, h, w], i) => (
            <div key={i} style={{ width: w, height: h, background: c }} />
          ))}
        </div>
        <div style={{ height: 14, background: "#d9bf98" }} />
      </div>
    </div>,
    size,
  );
}
