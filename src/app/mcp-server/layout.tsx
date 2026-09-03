import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MCP Server — Lazynext',
  description:
    'Lazynext MCP Server — expose platform capabilities as a standards-compliant Model Context Protocol server for external agents and AI clients.',
  robots: { index: false, follow: false },
};

export default function McpServerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
