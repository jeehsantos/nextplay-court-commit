import { useEffect, useState } from "react";

interface FloatingShape {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  type: "circle" | "square" | "triangle" | "hexagon";
  opacity: number;
}

const generateShapes = (count: number): FloatingShape[] => {
  const types: FloatingShape["type"][] = ["circle", "square", "triangle", "hexagon"];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 60 + 20,
    duration: Math.random() * 20 + 15,
    delay: Math.random() * -20,
    type: types[Math.floor(Math.random() * types.length)],
    opacity: Math.random() * 0.08 + 0.03,
  }));
};

const ShapeComponent = ({ shape }: { shape: FloatingShape }) => {
  const baseClasses = "absolute pointer-events-none";
  
  const style: React.CSSProperties = {
    left: `${shape.x}%`,
    top: `${shape.y}%`,
    width: shape.size,
    height: shape.size,
    opacity: shape.opacity,
    animation: `float-${shape.id % 3} ${shape.duration}s ease-in-out infinite`,
    animationDelay: `${shape.delay}s`,
  };

  switch (shape.type) {
    case "circle":
      return (
        <div
          className={`${baseClasses} rounded-full bg-primary`}
          style={style}
        />
      );
    case "square":
      return (
        <div
          className={`${baseClasses} rounded-lg bg-accent rotate-45`}
          style={style}
        />
      );
    case "triangle":
      return (
        <div
          className={baseClasses}
          style={{
            ...style,
            width: 0,
            height: 0,
            borderLeft: `${shape.size / 2}px solid transparent`,
            borderRight: `${shape.size / 2}px solid transparent`,
            borderBottom: `${shape.size}px solid hsl(var(--primary))`,
            backgroundColor: "transparent",
          }}
        />
      );
    case "hexagon":
      return (
        <div
          className={`${baseClasses} bg-primary`}
          style={{
            ...style,
            clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
          }}
        />
      );
    default:
      return null;
  }
};

export function FloatingShapes() {
  const [shapes, setShapes] = useState<FloatingShape[]>([]);

  useEffect(() => {
    setShapes(generateShapes(15));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <style>
        {`
          @keyframes float-0 {
            0%, 100% { transform: translate(0, 0) rotate(0deg); }
            25% { transform: translate(20px, -30px) rotate(90deg); }
            50% { transform: translate(-10px, 20px) rotate(180deg); }
            75% { transform: translate(15px, 10px) rotate(270deg); }
          }
          @keyframes float-1 {
            0%, 100% { transform: translate(0, 0) rotate(0deg); }
            33% { transform: translate(-25px, 15px) rotate(120deg); }
            66% { transform: translate(20px, -20px) rotate(240deg); }
          }
          @keyframes float-2 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(10px, -25px) scale(1.1); }
          }
        `}
      </style>
      {shapes.map((shape) => (
        <ShapeComponent key={shape.id} shape={shape} />
      ))}
    </div>
  );
}
