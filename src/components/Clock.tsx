import { useEffect, useState } from "react";

export default function Clock({ className = "" }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className={`block font-mono text-5xl font-semibold text-gray-800 ${className}`}>
      {time.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
    </span>
  );
}
