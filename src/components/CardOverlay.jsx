import React from "react";

export default function CardOverlay({ card }) {
  return (
    <div className="card overlay">
      <div className="cardTop">
        <div className="grab">⠿</div>
        <div className="cardTitle">{card.title}</div>
      </div>
      {card.description ? <div className="cardDesc">{card.description}</div> : null}
    </div>
  );
}
