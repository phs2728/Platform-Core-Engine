/**
 * Template Renderer — {{variable}} 치환
 *
 * HTML, Plain Text, Markdown 지원.
 * Conditional block: {{#if condition}}...{{/if}}
 */

import type { ITemplateRenderer } from '../interfaces/index.js';

export class DefaultTemplateRenderer implements ITemplateRenderer {
  render(template: string, variables: Record<string, unknown>): string {
    let result = template;

    // Conditional blocks: {{#if variable}}content{{/if}}
    result = result.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, varName: string, content: string) => {
      return variables[varName] ? content : '';
    });

    // Simple variable substitution: {{variable}}
    result = result.replace(/\{\{(\w+)\}\}/g, (_, varName: string) => {
      const value = variables[varName];
      if (value === undefined || value === null) return '';
      return String(value);
    });

    // Nested variable: {{object.property}}
    result = result.replace(/\{\{(\w+)\.(\w+)\}\}/g, (_, obj: string, prop: string) => {
      const value = (variables[obj] as Record<string, unknown>)?.[prop];
      if (value === undefined || value === null) return '';
      return String(value);
    });

    return result;
  }
}
