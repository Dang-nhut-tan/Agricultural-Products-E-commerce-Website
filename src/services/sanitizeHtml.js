const sanitizeHtml = require("sanitize-html");

const sanitizeRichText = (html = "") => sanitizeHtml(String(html), {
  allowedTags: [
    "p", "br", "strong", "b", "em", "i", "u", "s",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "blockquote", "ul", "ol", "li", "a", "code", "pre", "hr",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: (tagName, attributes) => ({
      tagName,
      attribs: {
        ...attributes,
        rel: "noopener noreferrer",
        ...(attributes.target === "_blank" ? { target: "_blank" } : {}),
      },
    }),
  },
  disallowedTagsMode: "discard",
});

module.exports = sanitizeRichText;
