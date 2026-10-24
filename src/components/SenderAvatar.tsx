"use client";

import { useState } from "react";
import { brandDomain } from "@/lib/logo";

/**
 * A sender's brand logo (Cash App, GitHub, ...) when one exists, otherwise the
 * first letter of their name. Logos are fetched through Mmail's own server.
 */
export function SenderAvatar({
  name,
  email,
  size = 44,
}: {
  name: string;
  email: string;
  size?: number;
}) {
  const domain = brandDomain(email);
  const [failed, setFailed] = useState(false);
  const letter = (name.trim()[0] ?? email.trim()[0] ?? "?").toUpperCase();

  return (
    <span
      className={`avatar${domain && !failed ? " has-logo" : ""}`}
      style={{ width: size, height: size }}
    >
      {domain && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/logo?d=${domain}`}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        letter
      )}
    </span>
  );
}
