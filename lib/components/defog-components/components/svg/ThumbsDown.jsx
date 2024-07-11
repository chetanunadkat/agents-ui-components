import React from "react";

const ThumbsDown = ({ fill = "#888888" }) => {
  return (
    // add to classname for tailwind to work
    <svg viewBox="0 0 14 14" fill={fill} xmlns="http://www.w3.org/2000/svg" className={fill}>
      <g clipPath="url(#clip0_986_6061)">
        <path
          d="M1.02083 0.583008H2.47917C3.04208 0.583008 3.5 1.04093 3.5 1.60384V8.31217C3.5 8.87509 3.04208 9.33301 2.47917 9.33301H1.02083C0.457917 9.33301 0 8.87509 0 8.31217V1.60384C0 1.04093 0.457917 0.583008 1.02083 0.583008Z"
        />
        <path
          d="M7.45558 13.5625C6.87225 13.5625 6.58058 13.2708 6.58058 11.8125C6.58058 10.4265 5.23833 9.31117 4.375 8.73658V1.51025C5.30892 1.078 7.1785 0.4375 10.0806 0.4375H11.0139C12.1514 0.4375 13.1197 1.25417 13.3122 2.37417L13.9656 6.16583C14.2106 7.595 13.1139 8.89583 11.6672 8.89583H8.91392C8.91392 8.89583 9.35142 9.77083 9.35142 11.2292C9.35142 12.9792 8.03892 13.5625 7.45558 13.5625Z"
        />
      </g>
      <defs>
        <clipPath id="clip0_986_6061">
          <rect
            width="14"
            height="14"
            fill="white"
            transform="matrix(1 0 0 -1 0 14)"
          />
        </clipPath>
      </defs>
    </svg>
  );
};

export default ThumbsDown;
