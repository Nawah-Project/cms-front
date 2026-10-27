import { useId } from "react";
export function GoalIllustration({
  kind,
}: {
  kind: "skills" | "people" | "business";
}) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      className="home-goal-art"
      viewBox="0 0 180 128"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={id}
          x1="30"
          y1="20"
          x2="160"
          y2="120"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#e5eee2" />
          <stop offset="1" stopColor="#f7f5e9" />
        </linearGradient>
      </defs>
      <ellipse cx="90" cy="108" rx="64" ry="8" fill="#173e3210" />
      <circle cx="90" cy="62" r="49" fill={`url(#${id})`} />
      {kind === "skills" ? (
        <>
          <rect
            x="38"
            y="30"
            width="104"
            height="72"
            rx="12"
            fill="white"
            stroke="#9fb4a4"
            strokeWidth="1.5"
          />
          <rect x="47" y="39" width="86" height="54" rx="6" fill="#f3f6ef" />
          <path
            d="m71 51-12 13 12 13m38-26 12 13-12 13m-12-29-12 32"
            stroke="#235e48"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M78 103v8m24-8v8m-33 0h42"
            stroke="#768f7e"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <rect x="123" y="14" width="31" height="31" rx="10" fill="#184e3b" />
          <path
            d="m132 29 5 5 9-11"
            stroke="#e2edaa"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="31" cy="78" r="6" fill="#d4e19e" />
        </>
      ) : kind === "people" ? (
        <>
          <rect
            x="50"
            y="24"
            width="81"
            height="81"
            rx="20"
            fill="white"
            stroke="#9fb4a4"
            strokeWidth="1.5"
          />
          <circle
            cx="90"
            cy="52"
            r="12"
            fill="#d8e6dc"
            stroke="#28634c"
            strokeWidth="1.5"
          />
          <path
            d="M68 86c0-13 9-21 22-21s22 8 22 21"
            fill="#e8efe1"
            stroke="#28634c"
            strokeWidth="1.5"
          />
          <circle cx="37" cy="60" r="17" fill="#dfe9e9" stroke="#779799" />
          <path
            d="m30 61 5 5 10-12"
            stroke="#32666c"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="142" cy="82" r="19" fill="#1c5945" />
          <path
            d="M134 80c-4-6 4-11 8-5 4-6 12-1 8 5l-8 9-8-9Z"
            fill="#dce9ae"
          />
          <path
            d="M36 82v15m-7-8h14m91-61 4-9 4 9 9 4-9 4-4 9-4-9-9-4Z"
            stroke="#8aa16b"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <rect
            x="39"
            y="43"
            width="102"
            height="60"
            rx="9"
            fill="white"
            stroke="#9fb4a4"
            strokeWidth="1.5"
          />
          <path
            d="M67 43V30a7 7 0 0 1 7-7h32a7 7 0 0 1 7 7v13"
            stroke="#28634c"
            strokeWidth="2"
          />
          <path d="M49 92h82" stroke="#c9d6c7" />
          <rect x="58" y="76" width="13" height="16" rx="2" fill="#c5d7c6" />
          <rect x="81" y="65" width="13" height="27" rx="2" fill="#86aa8c" />
          <rect x="104" y="52" width="13" height="40" rx="2" fill="#235e48" />
          <path
            d="m55 63 24-11 16 1 21-20m-12 0h12v12"
            stroke="#7e9662"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="146" cy="39" r="14" fill="#e3ecb2" />
          <path
            d="m139 39 5 5 9-10"
            stroke="#2a6048"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  );
}
