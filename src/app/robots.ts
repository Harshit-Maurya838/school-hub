import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/register-school", "/login"],
      disallow: ["/api/", "/platform/", "/school/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
