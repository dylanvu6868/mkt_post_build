import React from "react";

/* Simple markdown renderer — converts basic markdown to HTML */
export function MarkdownRenderer({ content }: { content: string }) {
  const html = convertMarkdown(content);
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

function convertMarkdown(md: string): string {
  let html = md;

  // Headers
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');

  // Bold + italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  html = html.replace(/`(.+?)`/g, '<code>$1</code>');

  // Tables
  html = html.replace(/^\|(.+)\|$/gm, (match) => {
    const cells = match.split("|").filter((c) => c.trim());
    const isSeparator = cells.every((c) => /^[\s-:]+$/.test(c));
    if (isSeparator) return "";
    return `<tr>${cells.map((c) => `<td>${c.trim()}</td>`).join("")}</tr>`;
  });
  html = html.replace(/(<tr>[\s\S]*?<\/tr>)/g, "<table>$1</table>");
  html = html.replace(/<\/table>\s*<table>/g, "");

  // Lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>");
  html = html.replace(/<\/ul>\s*<ul>/g, "");

  // Line breaks
  html = html.replace(/\n\n/g, '</p><p>');
  html = `<p>${html}</p>`;
  html = html.replace(/<p><h/g, '<h').replace(/<\/h(\d)><\/p>/g, '</h$1>');
  html = html.replace(/<p><table/g, '<table').replace(/<\/table><\/p>/g, '</table>');
  html = html.replace(/<p><ul/g, '<ul').replace(/<\/ul><\/p>/g, '</ul>');
  html = html.replace(/<p><pre/g, '<pre').replace(/<\/pre><\/p>/g, '</pre>');
  html = html.replace(/<p>\s*<\/p>/g, "");

  return html;
}
