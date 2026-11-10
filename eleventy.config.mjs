import { feedPlugin } from "@11ty/eleventy-plugin-rss";

export default function (eleventyConfig) {
  eleventyConfig.setInputDirectory(".");
  eleventyConfig.setOutputDirectory("dist");
  eleventyConfig.setIncludesDirectory("src/templates");
  eleventyConfig.setDataDirectory("content/data");
  eleventyConfig.setTemplateFormats(["md", "njk"]);
  eleventyConfig.ignores.add("README.md");
  eleventyConfig.ignores.add("dist/**");

  // Files copied into the site unchanged.
  eleventyConfig.addPassthroughCopy({ "src/static": "/", "src/sky": "/sky", "src/styles": "/styles" });

  // Posts marked `draft: true` show up in `npm run dev` but are never published.
  eleventyConfig.addPreprocessor("drafts", "*", (data) => {
    if (data.draft && process.env.ELEVENTY_RUN_MODE === "build") return false;
  });

  eleventyConfig.addFilter("monthYear", (date) =>
    new Date(date).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }));
  eleventyConfig.addFilter("longDate", (date) =>
    new Date(date).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }));
  eleventyConfig.addFilter("isoDate", (date) => new Date(date).toISOString().slice(0, 10));
  eleventyConfig.addFilter("readingTime", (html) => {
    const words = String(html).replace(/<[^>]+>/g, " ").trim().split(/\s+/).length;
    return Math.max(1, Math.round(words / 225));
  });
  eleventyConfig.addFilter("newestFirst", (posts) => [...posts].reverse());

  eleventyConfig.addPlugin(feedPlugin, {
    type: "atom",
    outputPath: "/feed.xml",
    collection: { name: "post", limit: 20 },
    metadata: {
      language: "en",
      title: "Rudy",
      subtitle: "Writing from rudybanerjee.com",
      base: "https://rudybanerjee.com/",
      author: { name: "Rudy" },
    },
  });
}
